from fastapi import APIRouter, HTTPException
from app.models import PresignedUrlRequest, PresignedUrlResponse
from app.services.s3_service import s3_service
from datetime import datetime, timedelta

router = APIRouter(prefix="/downloads", tags=["downloads"])

@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def generate_presigned_url(request: PresignedUrlRequest):
    """Generate a presigned URL for downloading a file"""
    try:
        url = s3_service.generate_presigned_url(
            request.file_path, 
            expiration=request.expires_in
        )
        
        expires_at = datetime.utcnow() + timedelta(seconds=request.expires_in)
        
        return PresignedUrlResponse(
            url=url,
            expires_at=expires_at,
            file_path=request.file_path
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating presigned URL: {str(e)}")