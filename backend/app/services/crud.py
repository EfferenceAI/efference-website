"""
CRUD operations for database models.
Contains reusable functions for Create, Read, Update, Delete operations.
"""
import uuid
from typing import Optional, List, Type
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from datetime import datetime

from ..db import models
from . import schemas


# --- Generic CRUD Operations ---

def get_by_id(db: Session, model: Type, id_value: uuid.UUID):
    """Generic function to get a record by ID"""
    return db.query(model).filter(getattr(model, f"{model.__tablename__[:-1]}_id") == id_value).first()


def delete_by_id(db: Session, model: Type, id_value: uuid.UUID) -> bool:
    """Generic function to delete a record by ID"""
    record = get_by_id(db, model, id_value)
    if record:
        db.delete(record)
        db.commit()
        return True
    return False


# --- User CRUD Operations ---

def get_user(db: Session, user_id: uuid.UUID) -> Optional[models.User]:
    """Get a user by ID"""
    return db.query(models.User).filter(models.User.user_id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Get a user by email address"""
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100, role: Optional[models.UserRole] = None) -> List[models.User]:
    """Get multiple users with optional filtering"""
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    return query.offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Create a new user"""
    db_user = models.User(
        name=user.name,
        email=user.email,
        role=user.role
    )
    # Use the property setter to hash the password
    db_user.password = user.password
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: uuid.UUID, user_update: schemas.UserUpdate) -> Optional[models.User]:
    """Update user information"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user_password(db: Session, user_id: uuid.UUID, password_update: schemas.UserPasswordUpdate) -> Optional[models.User]:
    """Update user password"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    # Verify current password
    if not db_user.check_password(password_update.current_password):
        return None
    
    # Set new password
    db_user.password = password_update.new_password
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: uuid.UUID) -> bool:
    """Delete a user"""
    return delete_by_id(db, models.User, user_id)


# --- Invitation CRUD Operations ---

def get_invitation(db: Session, invitation_id: uuid.UUID) -> Optional[models.Invitation]:
    """Get an invitation by ID"""
    return db.query(models.Invitation).options(joinedload(models.Invitation.invited_by)).filter(models.Invitation.invitation_id == invitation_id).first()


def get_invitation_by_code(db: Session, invitation_code: str) -> Optional[models.Invitation]:
    """Get an invitation by its unique code"""
    return db.query(models.Invitation).filter(models.Invitation.invitation_code == invitation_code).first()


def get_invitations(db: Session, skip: int = 0, limit: int = 100, status: Optional[models.InvitationStatus] = None, invited_by_id: Optional[uuid.UUID] = None) -> List[models.Invitation]:
    """Get multiple invitations with optional filtering"""
    query = db.query(models.Invitation).options(joinedload(models.Invitation.invited_by))
    if status:
        query = query.filter(models.Invitation.status == status)
    if invited_by_id:
        query = query.filter(models.Invitation.invited_by_id == invited_by_id)
    return query.order_by(models.Invitation.created_at.desc()).offset(skip).limit(limit).all()


def create_invitation(db: Session, invitation: schemas.InvitationCreate, invited_by_id: uuid.UUID, expires_at: datetime) -> models.Invitation:
    """Create a new invitation"""
    import secrets
    invitation_code = secrets.token_urlsafe(32)
    
    db_invitation = models.Invitation(
        email=invitation.email,
        role=invitation.role,
        invited_by_id=invited_by_id,
        expires_at=expires_at,
        invitation_code=invitation_code
    )
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    return db_invitation


def update_invitation_status(db: Session, invitation_id: uuid.UUID, status: models.InvitationStatus, used_at: Optional[datetime] = None) -> Optional[models.Invitation]:
    """Update the status of an invitation"""
    db_invitation = get_invitation(db, invitation_id)
    if not db_invitation:
        return None
    
    db_invitation.status = status
    if used_at:
        db_invitation.used_at = used_at
        
    db.commit()
    db.refresh(db_invitation)
    return db_invitation


def mark_invitation_sent(db: Session, invitation_id: uuid.UUID) -> Optional[models.Invitation]:
    """Mark an invitation as sent"""
    db_invitation = get_invitation(db, invitation_id)
    if not db_invitation:
        return None
    
    db_invitation.status = models.InvitationStatus.SENT
    db_invitation.sent_at = datetime.utcnow()
    db.commit()
    db.refresh(db_invitation)
    return db_invitation


def delete_invitation(db: Session, invitation_id: uuid.UUID) -> bool:
    """Delete an invitation"""
    return delete_by_id(db, models.Invitation, invitation_id)


# --- Task CRUD Operations ---

def get_task(db: Session, task_id: uuid.UUID) -> Optional[models.Task]:
    """Get a task by ID"""
    return db.query(models.Task).filter(models.Task.task_id == task_id).first()


def get_tasks(db: Session, skip: int = 0, limit: int = 100, created_by_id: Optional[uuid.UUID] = None) -> List[models.Task]:
    """Get multiple tasks with optional filtering"""
    query = db.query(models.Task).options(joinedload(models.Task.creator))
    if created_by_id:
        query = query.filter(models.Task.created_by_id == created_by_id)
    return query.offset(skip).limit(limit).all()


def create_task(db: Session, task: schemas.TaskCreate, created_by_id: uuid.UUID) -> models.Task:
    """Create a new task"""
    db_task = models.Task(
        title=task.title,
        description=task.description,
        created_by_id=created_by_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: uuid.UUID, task_update: schemas.TaskUpdate) -> Optional[models.Task]:
    """Update a task"""
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    
    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: uuid.UUID) -> bool:
    """Delete a task"""
    return delete_by_id(db, models.Task, task_id)


# --- Task Assignment CRUD Operations ---

def get_task_assignment(db: Session, assignment_id: uuid.UUID) -> Optional[models.TaskAssignment]:
    """Get a task assignment by ID"""
    return db.query(models.TaskAssignment).filter(models.TaskAssignment.assignment_id == assignment_id).first()


def get_task_assignments(db: Session, task_id: Optional[uuid.UUID] = None, user_id: Optional[uuid.UUID] = None) -> List[models.TaskAssignment]:
    """Get task assignments with optional filtering"""
    query = db.query(models.TaskAssignment).options(
        joinedload(models.TaskAssignment.task),
        joinedload(models.TaskAssignment.user)
    )
    if task_id:
        query = query.filter(models.TaskAssignment.task_id == task_id)
    if user_id:
        query = query.filter(models.TaskAssignment.user_id == user_id)
    return query.all()


def create_task_assignment(db: Session, assignment: schemas.TaskAssignmentCreate) -> models.TaskAssignment:
    """Create a new task assignment"""
    # Check if assignment already exists
    existing = db.query(models.TaskAssignment).filter(
        and_(models.TaskAssignment.task_id == assignment.task_id,
             models.TaskAssignment.user_id == assignment.user_id)
    ).first()
    
    if existing:
        return existing
    
    db_assignment = models.TaskAssignment(
        task_id=assignment.task_id,
        user_id=assignment.user_id
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment


def delete_task_assignment(db: Session, assignment_id: uuid.UUID) -> bool:
    """Delete a task assignment"""
    return delete_by_id(db, models.TaskAssignment, assignment_id)


# --- Video Session CRUD Operations ---

def get_video_session(db: Session, session_id: uuid.UUID) -> Optional[models.VideoSession]:
    """Get a video session by ID"""
    return db.query(models.VideoSession).options(
        joinedload(models.VideoSession.creator),
        joinedload(models.VideoSession.task),
        joinedload(models.VideoSession.reviewer),
        joinedload(models.VideoSession.raw_clips),
        joinedload(models.VideoSession.processing_jobs),
        joinedload(models.VideoSession.review)
    ).filter(models.VideoSession.session_id == session_id).first()


def get_video_sessions(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    creator_id: Optional[uuid.UUID] = None,
    reviewer_id: Optional[uuid.UUID] = None,
    status: Optional[models.VideoSessionStatus] = None,
    task_id: Optional[uuid.UUID] = None
) -> List[models.VideoSession]:
    """Get multiple video sessions with optional filtering"""
    query = db.query(models.VideoSession).options(
        joinedload(models.VideoSession.creator),
        joinedload(models.VideoSession.task),
        joinedload(models.VideoSession.reviewer)
    )
    
    if creator_id:
        query = query.filter(models.VideoSession.creator_id == creator_id)
    if reviewer_id:
        query = query.filter(models.VideoSession.reviewer_id == reviewer_id)
    if status:
        query = query.filter(models.VideoSession.status == status)
    if task_id:
        query = query.filter(models.VideoSession.task_id == task_id)
    
    return query.offset(skip).limit(limit).all()


def create_video_session(db: Session, session: schemas.VideoSessionCreate, creator_id: uuid.UUID) -> models.VideoSession:
    """Create a new video session"""
    db_session = models.VideoSession(
        creator_id=creator_id,
        task_id=session.task_id,
        reviewer_id=session.reviewer_id,
        status=models.VideoSessionStatus.UPLOADING
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def update_video_session(db: Session, session_id: uuid.UUID, session_update: schemas.VideoSessionUpdate) -> Optional[models.VideoSession]:
    """Update a video session"""
    db_session = get_video_session(db, session_id)
    if not db_session:
        return None
    
    update_data = session_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_session, field, value)
    
    db_session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_session)
    return db_session


def delete_video_session(db: Session, session_id: uuid.UUID) -> bool:
    """Delete a video session"""
    return delete_by_id(db, models.VideoSession, session_id)


# --- Raw Clip CRUD Operations ---

def get_raw_clip(db: Session, clip_id: uuid.UUID) -> Optional[models.RawClip]:
    """Get a raw clip by ID"""
    return db.query(models.RawClip).filter(models.RawClip.clip_id == clip_id).first()


def get_raw_clips_by_session(db: Session, session_id: uuid.UUID) -> List[models.RawClip]:
    """Get all raw clips for a session"""
    return db.query(models.RawClip).filter(models.RawClip.session_id == session_id).order_by(models.RawClip.part_number).all()


def create_raw_clip(db: Session, clip: schemas.RawClipCreate) -> models.RawClip:
    """Create a new raw clip record"""
    db_clip = models.RawClip(
        session_id=clip.session_id,
        s3_key=clip.s3_key,
        part_number=clip.part_number,
        filesize_bytes=clip.filesize_bytes
    )
    db.add(db_clip)
    db.commit()
    db.refresh(db_clip)
    return db_clip


def update_raw_clip(db: Session, clip_id: uuid.UUID, clip_update: schemas.RawClipUpdate) -> Optional[models.RawClip]:
    """Update a raw clip"""
    db_clip = get_raw_clip(db, clip_id)
    if not db_clip:
        return None
    
    update_data = clip_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_clip, field, value)
    
    db.commit()
    db.refresh(db_clip)
    return db_clip


def delete_raw_clip(db: Session, clip_id: uuid.UUID) -> bool:
    """Delete a raw clip"""
    return delete_by_id(db, models.RawClip, clip_id)


# --- Review CRUD Operations ---

def get_review(db: Session, review_id: uuid.UUID) -> Optional[models.Review]:
    """Get a review by ID"""
    return db.query(models.Review).options(
        joinedload(models.Review.reviewer),
        joinedload(models.Review.session)
    ).filter(models.Review.review_id == review_id).first()


def get_review_by_session(db: Session, session_id: uuid.UUID) -> Optional[models.Review]:
    """Get review for a specific session"""
    return db.query(models.Review).filter(models.Review.session_id == session_id).first()


def get_reviews(db: Session, skip: int = 0, limit: int = 100, reviewer_id: Optional[uuid.UUID] = None) -> List[models.Review]:
    """Get multiple reviews with optional filtering"""
    query = db.query(models.Review).options(
        joinedload(models.Review.reviewer),
        joinedload(models.Review.session)
    )
    
    if reviewer_id:
        query = query.filter(models.Review.reviewer_id == reviewer_id)
    
    return query.offset(skip).limit(limit).all()


def create_review(db: Session, review: schemas.ReviewCreate, reviewer_id: uuid.UUID) -> models.Review:
    """Create a new review"""
    db_review = models.Review(
        session_id=review.session_id,
        reviewer_id=reviewer_id,
        status=review.status,
        comments=review.comments
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review


def update_review(db: Session, review_id: uuid.UUID, review_update: schemas.ReviewUpdate) -> Optional[models.Review]:
    """Update a review"""
    db_review = get_review(db, review_id)
    if not db_review:
        return None
    
    update_data = review_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_review, field, value)
    
    db.commit()
    db.refresh(db_review)
    return db_review


def delete_review(db: Session, review_id: uuid.UUID) -> bool:
    """Delete a review"""
    return delete_by_id(db, models.Review, review_id)


# --- Processing Job CRUD Operations ---

def get_processing_job(db: Session, job_id: uuid.UUID) -> Optional[models.ProcessingJob]:
    """Get a processing job by ID"""
    return db.query(models.ProcessingJob).filter(models.ProcessingJob.job_id == job_id).first()


def get_processing_jobs_by_session(db: Session, session_id: uuid.UUID) -> List[models.ProcessingJob]:
    """Get all processing jobs for a session"""
    return db.query(models.ProcessingJob).filter(models.ProcessingJob.session_id == session_id).all()


def create_processing_job(db: Session, job: schemas.ProcessingJobCreate) -> models.ProcessingJob:
    """Create a new processing job"""
    db_job = models.ProcessingJob(
        session_id=job.session_id,
        step_function_execution_arn=job.step_function_execution_arn,
        status=job.status
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


def update_processing_job(db: Session, job_id: uuid.UUID, job_update: schemas.ProcessingJobUpdate) -> Optional[models.ProcessingJob]:
    """Update a processing job"""
    db_job = get_processing_job(db, job_id)
    if not db_job:
        return None
    
    update_data = job_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_job, field, value)
    
    db.commit()
    db.refresh(db_job)
    return db_job


def delete_processing_job(db: Session, job_id: uuid.UUID) -> bool:
    """Delete a processing job"""
    return delete_by_id(db, models.ProcessingJob, job_id)


# --- Statistics and Analytics ---

def get_user_statistics(db: Session, user_id: uuid.UUID) -> dict:
    """Get statistics for a specific user"""
    user = get_user(db, user_id)
    if not user:
        return {}
    
    stats = {
        "user_id": user_id,
        "total_sessions_created": 0,
        "total_reviews_submitted": 0,
        "total_tasks_assigned": 0,
        "total_tasks_created": 0
    }
    
    # Count sessions created
    if user.role == models.UserRole.TRAINER:
        stats["total_sessions_created"] = db.query(models.VideoSession).filter(
            models.VideoSession.creator_id == user_id
        ).count()
    
    # Count reviews submitted
    if user.role == models.UserRole.REVIEWER:
        stats["total_reviews_submitted"] = db.query(models.Review).filter(
            models.Review.reviewer_id == user_id
        ).count()
    
    # Count task assignments
    if user.role == models.UserRole.TRAINER:
        stats["total_tasks_assigned"] = db.query(models.TaskAssignment).filter(
            models.TaskAssignment.user_id == user_id
        ).count()
    
    # Count tasks created
    if user.role == models.UserRole.ADMIN:
        stats["total_tasks_created"] = db.query(models.Task).filter(
            models.Task.created_by_id == user_id
        ).count()
    
    return stats


def get_dashboard_statistics(db: Session) -> dict:
    """Get overall dashboard statistics"""
    return {
        "total_users": db.query(models.User).count(),
        "total_tasks": db.query(models.Task).count(),
        "total_video_sessions": db.query(models.VideoSession).count(),
        "total_reviews": db.query(models.Review).count(),
        "sessions_by_status": {
            status.value: db.query(models.VideoSession).filter(models.VideoSession.status == status).count()
            for status in models.VideoSessionStatus
        },
        "users_by_role": {
            role.value: db.query(models.User).filter(models.User.role == role).count()
            for role in models.UserRole
        }
    }