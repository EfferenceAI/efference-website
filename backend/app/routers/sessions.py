"""
Video session management API endpoints.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.services import crud, schemas, database, auth
from ..db import models
from ..db.models import VideoSessionStatus

router = APIRouter(prefix="/sessions", tags=["video-sessions"])


@router.post("/", response_model=schemas.VideoSession, status_code=status.HTTP_201_CREATED)
def create_video_session(
    session: schemas.VideoSessionCreate,
    creator_id: uuid.UUID = Query(..., description="ID of the user creating the session"),
    db: Session = Depends(database.get_db)
):
    """Create a new video session"""
    # Verify that the creator exists
    creator = crud.get_user(db, user_id=creator_id)
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator not found"
        )
    
    # Verify that the task exists
    task = crud.get_task(db, task_id=session.task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify reviewer if provided
    if session.reviewer_id:
        reviewer = crud.get_user(db, user_id=session.reviewer_id)
        if not reviewer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reviewer not found"
            )
    
    return crud.create_video_session(db=db, session=session, creator_id=creator_id)


@router.post("/upload", response_model=schemas.VideoSession, status_code=status.HTTP_201_CREATED)
def create_video_session_from_upload(
    session: schemas.VideoSessionCreateFromUpload,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Create a new video session from frontend upload"""
    try:
        # For now, create a default task if none provided
        if not session.task_id:
            # Get or create a default task
            default_task = crud.get_tasks(db, limit=1)
            if not default_task:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No tasks available. Please create a task first."
                )
            session.task_id = default_task[0].task_id
        
        # Use the authenticated user as creator
        session.creator_id = current_user.user_id

        # Create the video session with upload data
        return crud.create_video_session_from_upload(db=db, session=session)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create video session: {str(e)}"
        )


@router.get("/", response_model=List[schemas.VideoSession])
def list_video_sessions(
    skip: int = Query(0, ge=0, description="Number of sessions to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of sessions to return"),
    creator_id: Optional[uuid.UUID] = Query(None, description="Filter by creator ID"),
    reviewer_id: Optional[uuid.UUID] = Query(None, description="Filter by reviewer ID"),
    status: Optional[str] = Query(None, description="Filter by status (comma-separated for multiple)"),
    task_id: Optional[uuid.UUID] = Query(None, description="Filter by task ID"),
    db: Session = Depends(database.get_db)
):
    """Get a list of video sessions"""
    # Parse status parameter to handle multiple statuses
    status_list = None
    if status:
        try:
            status_list = [VideoSessionStatus(s.strip()) for s in status.split(',')]
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value: {str(e)}"
            )
    
    sessions = crud.get_video_sessions(
        db,
        skip=skip,
        limit=limit,
        creator_id=creator_id,
        reviewer_id=reviewer_id,
        status=status_list,
        task_id=task_id
    )
    return sessions


@router.get("/{session_id}", response_model=schemas.VideoSessionWithDetails)
def get_video_session(
    session_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get a specific video session by ID with all details"""
    db_session = crud.get_video_session(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    return db_session


@router.put("/{session_id}", response_model=schemas.VideoSession)
def update_video_session(
    session_id: uuid.UUID,
    session_update: schemas.VideoSessionUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a video session"""
    # Verify reviewer if being updated
    if session_update.reviewer_id:
        reviewer = crud.get_user(db, user_id=session_update.reviewer_id)
        if not reviewer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reviewer not found"
            )
    
    db_session = crud.update_video_session(db, session_id=session_id, session_update=session_update)
    if db_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    return db_session


@router.delete("/{session_id}", response_model=schemas.MessageResponse)
def delete_video_session(
    session_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Delete a video session"""
    if not crud.delete_video_session(db, session_id=session_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    return schemas.MessageResponse(message="Video session deleted successfully")


# --- Raw Clips Endpoints ---

@router.get("/{session_id}/clips", response_model=List[schemas.RawClip])
def list_raw_clips(
    session_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get all raw clips for a video session"""
    # Verify session exists
    session = crud.get_video_session(db, session_id=session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    
    return crud.get_raw_clips_by_session(db, session_id=session_id)


@router.post("/{session_id}/clips", response_model=schemas.RawClip, status_code=status.HTTP_201_CREATED)
def create_raw_clip(
    session_id: uuid.UUID,
    clip: schemas.RawClipCreate,
    db: Session = Depends(database.get_db)
):
    """Create a new raw clip record"""
    # Verify session exists
    session = crud.get_video_session(db, session_id=session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    
    # Ensure the clip belongs to the correct session
    if clip.session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Clip session_id must match URL session_id"
        )
    
    return crud.create_raw_clip(db=db, clip=clip)


@router.put("/clips/{clip_id}", response_model=schemas.RawClip)
def update_raw_clip(
    clip_id: uuid.UUID,
    clip_update: schemas.RawClipUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a raw clip"""
    db_clip = crud.update_raw_clip(db, clip_id=clip_id, clip_update=clip_update)
    if db_clip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Raw clip not found"
        )
    return db_clip


@router.delete("/clips/{clip_id}", response_model=schemas.MessageResponse)
def delete_raw_clip(
    clip_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Delete a raw clip"""
    if not crud.delete_raw_clip(db, clip_id=clip_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Raw clip not found"
        )
    return schemas.MessageResponse(message="Raw clip deleted successfully")


# --- Processing Jobs Endpoints ---

@router.get("/{session_id}/processing-jobs", response_model=List[schemas.ProcessingJob])
def list_processing_jobs(
    session_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get all processing jobs for a video session"""
    # Verify session exists
    session = crud.get_video_session(db, session_id=session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    
    return crud.get_processing_jobs_by_session(db, session_id=session_id)


@router.post("/{session_id}/processing-jobs", response_model=schemas.ProcessingJob, status_code=status.HTTP_201_CREATED)
def create_processing_job(
    session_id: uuid.UUID,
    job: schemas.ProcessingJobCreate,
    db: Session = Depends(database.get_db)
):
    """Create a new processing job"""
    # Verify session exists
    session = crud.get_video_session(db, session_id=session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    
    # Ensure the job belongs to the correct session
    if job.session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job session_id must match URL session_id"
        )
    
    return crud.create_processing_job(db=db, job=job)


@router.put("/processing-jobs/{job_id}", response_model=schemas.ProcessingJob)
def update_processing_job(
    job_id: uuid.UUID,
    job_update: schemas.ProcessingJobUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a processing job"""
    db_job = crud.update_processing_job(db, job_id=job_id, job_update=job_update)
    if db_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processing job not found"
        )
    return db_job