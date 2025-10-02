"""
File upload management API endpoints.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import boto3
from botocore.exceptions import ClientError
import os

from app.services import crud, schemas, database
from ..db.models import VideoSessionStatus

router = APIRouter(prefix="/upload", tags=["file-upload"])

# AWS S3 Configuration
s3_client = boto3.client(
    's3',
    region_name=os.getenv('AWS_REGION', 'us-east-1'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'uploadz-videos')
UPLOAD_EXPIRATION = 3600  # 1 hour


@router.post("/presigned-url", response_model=schemas.PresignedUrlResponse)
def generate_presigned_url(
    request: schemas.PresignedUrlRequest,
    db: Session = Depends(database.get_db)
):
    """Generate a presigned URL for direct file upload to S3"""
    try:
        # Verify the session exists
        session = crud.get_video_session(db, session_id=request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video session not found"
            )

        # Generate S3 key
        sanitized_filename = request.filename.replace(' ', '_').replace('/', '_')
        s3_key = f"sessions/{request.session_id}/part_{request.part_number}_{sanitized_filename}"

        # Generate presigned URL
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'ContentType': request.content_type,
                'Metadata': {
                    'session-id': str(request.session_id),
                    'part-number': str(request.part_number),
                    'original-filename': request.filename
                }
            },
            ExpiresIn=UPLOAD_EXPIRATION
        )

        return schemas.PresignedUrlResponse(
            upload_url=presigned_url,
            fields={},
            s3_key=s3_key
        )

    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {str(e)}"
        )


@router.post("/complete", response_model=schemas.MessageResponse)
def complete_upload(
    request: schemas.UploadCompleteRequest,
    db: Session = Depends(database.get_db)
):
    """Mark an upload as complete and create a raw clip record"""
    try:
        # Verify the session exists
        session = crud.get_video_session(db, session_id=request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video session not found"
            )

        # Create raw clip record
        clip_data = schemas.RawClipCreate(
            session_id=request.session_id,
            s3_key=request.s3_key,
            part_number=request.part_number,
            filesize_bytes=request.filesize_bytes
        )
        
        crud.create_raw_clip(db=db, clip=clip_data)

        # Update session status if this is the first upload
        if session.status == VideoSessionStatus.UPLOADING:
            session_update = schemas.VideoSessionUpdate(
                status=VideoSessionStatus.PROCESSING
            )
            crud.update_video_session(db, session_id=request.session_id, session_update=session_update)

        return schemas.MessageResponse(message="Upload completed successfully")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete upload: {str(e)}"
        )


@router.post("/multipart/initiate")
def initiate_multipart_upload(
    session_id: uuid.UUID,
    filename: str,
    content_type: str,
    file_size: int,
    db: Session = Depends(database.get_db)
):
    """Initiate a multipart upload for large files"""
    try:
        # Verify the session exists
        session = crud.get_video_session(db, session_id=session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video session not found"
            )

        # Generate S3 key
        sanitized_filename = filename.replace(' ', '_').replace('/', '_')
        s3_key = f"sessions/{session_id}/multipart_{sanitized_filename}"

        # Calculate optimal part size and number of parts
        part_size = max(100 * 1024 * 1024, file_size // 1000)  # 100MB or file_size/1000
        total_parts = (file_size + part_size - 1) // part_size

        # Initiate multipart upload
        response = s3_client.create_multipart_upload(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            ContentType=content_type,
            Metadata={
                'session-id': str(session_id),
                'original-filename': filename,
                'file-size': str(file_size)
            }
        )

        return {
            "upload_id": response['UploadId'],
            "s3_key": s3_key,
            "part_size": part_size,
            "total_parts": total_parts
        }

    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate multipart upload: {str(e)}"
        )


@router.post("/multipart/part-url")
def get_multipart_part_url(
    upload_id: str,
    s3_key: str,
    part_number: int,
    db: Session = Depends(database.get_db)
):
    """Get presigned URL for uploading a specific part"""
    try:
        presigned_url = s3_client.generate_presigned_url(
            'upload_part',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'PartNumber': part_number,
                'UploadId': upload_id
            },
            ExpiresIn=UPLOAD_EXPIRATION
        )

        return {
            "presigned_url": presigned_url,
            "part_number": part_number
        }

    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate part upload URL: {str(e)}"
        )


@router.post("/multipart/complete")
def complete_multipart_upload(
    session_id: uuid.UUID,
    upload_id: str,
    s3_key: str,
    parts: List[dict],  # [{"PartNumber": 1, "ETag": "..."}]
    file_size: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """Complete a multipart upload"""
    try:
        # Verify the session exists
        session = crud.get_video_session(db, session_id=session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video session not found"
            )

        # Complete multipart upload
        response = s3_client.complete_multipart_upload(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            UploadId=upload_id,
            MultipartUpload={'Parts': parts}
        )

        # Create raw clip record for the completed upload
        clip_data = schemas.RawClipCreate(
            session_id=session_id,
            s3_key=s3_key,
            part_number=1,  # For multipart uploads, we treat the whole file as one logical part
            filesize_bytes=file_size
        )
        
        crud.create_raw_clip(db=db, clip=clip_data)

        # Update session status
        if session.status == VideoSessionStatus.UPLOADING:
            session_update = schemas.VideoSessionUpdate(
                status=VideoSessionStatus.PROCESSING
            )
            crud.update_video_session(db, session_id=session_id, session_update=session_update)

        return {
            "message": "Multipart upload completed successfully",
            "location": response['Location'],
            "etag": response['ETag']
        }

    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete multipart upload: {str(e)}"
        )


@router.delete("/multipart/abort")
def abort_multipart_upload(
    upload_id: str,
    s3_key: str,
    db: Session = Depends(database.get_db)
):
    """Abort a multipart upload"""
    try:
        s3_client.abort_multipart_upload(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            UploadId=upload_id
        )

        return schemas.MessageResponse(message="Multipart upload aborted successfully")

    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to abort multipart upload: {str(e)}"
        )