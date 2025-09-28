import uuid
import enum
from datetime import datetime
from typing import Optional

# Import password hashing utilities
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    ForeignKey,
    DateTime,
    Integer,
    Enum as SQLAlchemyEnum,
    UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .base import Base


# --- Enums for Roles and Statuses ---

class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    TRAINER = "TRAINER"
    REVIEWER = "REVIEWER"

class VideoSessionStatus(enum.Enum):
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FAILED = "FAILED"

class ReviewStatus(enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ProcessingJobStatus(enum.Enum):
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class InvitationStatus(enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    USED = "USED"
    EXPIRED = "EXPIRED"


# --- Model Definitions ---

class User(Base):
    """Represents a user in the system, who can be an Admin, Trainer, or Reviewer."""
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    role: Mapped[UserRole] = mapped_column(SQLAlchemyEnum(UserRole), nullable=False)
    
    # --- Security ---
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # --- Is User active ---
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # --- Invitation Status ---
    is_invited: Mapped[bool] = mapped_column(default=False, nullable=False)
    invitation_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    # A user (admin) can create many tasks
    created_tasks: Mapped[list["Task"]] = relationship(back_populates="creator", foreign_keys="[Task.created_by_id]")
    
    # A user (trainer) can have many task assignments
    task_assignments: Mapped[list["TaskAssignment"]] = relationship(back_populates="user")

    # A user (trainer) can create many video sessions
    created_sessions: Mapped[list["VideoSession"]] = relationship(back_populates="creator", foreign_keys="[VideoSession.creator_id]")

    # A user (reviewer) can be assigned to review many video sessions
    assigned_review_sessions: Mapped[list["VideoSession"]] = relationship(back_populates="reviewer", foreign_keys="[VideoSession.reviewer_id]")
    
    # A user (reviewer) can submit many reviews
    reviews_submitted: Mapped[list["Review"]] = relationship(back_populates="reviewer")

    # A user (admin) can send many invitations
    sent_invitations: Mapped[list["Invitation"]] = relationship(back_populates="invited_by")

    def __repr__(self):
        return f"<User(user_id={self.user_id}, name='{self.name}', role='{self.role.name}')>"


class Invitation(Base):
    """Represents an invitation code sent to a potential user."""
    __tablename__ = "invitations"

    invitation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invitation_code: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[UserRole] = mapped_column(SQLAlchemyEnum(UserRole), nullable=False)
    
    # Invitation metadata
    status: Mapped[InvitationStatus] = mapped_column(SQLAlchemyEnum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)
    invited_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    invited_by: Mapped["User"] = relationship(back_populates="sent_invitations")
    
    def __repr__(self):
        return f"<Invitation(invitation_id={self.invitation_id}, email='{self.email}', status='{self.status.name}')>"


class Task(Base):
    """Represents a task defined by an Admin to be completed by a Trainer."""
    __tablename__ = "tasks"

    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"))

    # --- Relationships ---
    creator: Mapped["User"] = relationship(back_populates="created_tasks")
    assignments: Mapped[list["TaskAssignment"]] = relationship(back_populates="task")

    def __repr__(self):
        return f"<Task(task_id={self.task_id}, title='{self.title}')>"


class TaskAssignment(Base):
    """Links a Trainer (User) to a Task they are assigned to complete."""
    __tablename__ = "task_assignments"

    assignment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.task_id"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id")) # This user must be a TRAINER
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    task: Mapped["Task"] = relationship(back_populates="assignments")
    user: Mapped["User"] = relationship(back_populates="task_assignments")

    def __repr__(self):
        return f"<TaskAssignment(task_id={self.task_id}, user_id={self.user_id})>"


class VideoSession(Base):
    """The central entity, representing a recording session for a specific task by a trainer."""
    __tablename__ = "video_sessions"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id")) # The trainer
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.task_id"))
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True) # The reviewer
    
    status: Mapped[VideoSessionStatus] = mapped_column(SQLAlchemyEnum(VideoSessionStatus), default=VideoSessionStatus.UPLOADING, nullable=False)

    raw_concatenated_s3_key: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    processed_1080p_s3_key: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    
    # For Step Functions manual review step
    step_function_task_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- Relationships ---
    creator: Mapped["User"] = relationship(back_populates="created_sessions", foreign_keys=[creator_id])
    task: Mapped["Task"] = relationship()
    reviewer: Mapped["User"] = relationship(back_populates="assigned_review_sessions", foreign_keys=[reviewer_id])
    
    raw_clips: Mapped[list["RawClip"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    processing_jobs: Mapped[list["ProcessingJob"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    review: Mapped["Review"] = relationship(back_populates="session", cascade="all, delete-orphan", uselist=False)

    def __repr__(self):
        return f"<VideoSession(session_id={self.session_id}, status='{self.status.name}')>"


class RawClip(Base):
    """Tracks each individual raw video file uploaded as part of a VideoSession."""
    __tablename__ = "raw_clips"

    clip_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("video_sessions.session_id"))
    s3_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    part_number: Mapped[int] = mapped_column(Integer, nullable=False)
    filesize_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    upload_completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    session: Mapped["VideoSession"] = relationship(back_populates="raw_clips")
    
    __table_args__ = (UniqueConstraint('session_id', 'part_number', name='_session_part_uc'),)

    def __repr__(self):
        return f"<RawClip(clip_id={self.clip_id}, s3_key='{self.s3_key}')>"


class Review(Base):
    """Represents a review submitted by a Reviewer for a completed VideoSession."""
    __tablename__ = "reviews"

    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("video_sessions.session_id"), unique=True)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    
    status: Mapped[ReviewStatus] = mapped_column(SQLAlchemyEnum(ReviewStatus), nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    session: Mapped["VideoSession"] = relationship(back_populates="review")
    reviewer: Mapped["User"] = relationship(back_populates="reviews_submitted")
    
    def __repr__(self):
        return f"<Review(review_id={self.review_id}, status='{self.status.name}')>"


class ProcessingJob(Base):
    """Logs the execution details of the backend processing workflow for auditing."""
    __tablename__ = "processing_jobs"
    
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("video_sessions.session_id"))
    step_function_execution_arn: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    batch_job_id_concat: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    batch_job_id_transcode: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    status: Mapped[ProcessingJobStatus] = mapped_column(SQLAlchemyEnum(ProcessingJobStatus), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # --- Relationships ---
    session: Mapped["VideoSession"] = relationship(back_populates="processing_jobs")

    def __repr__(self):
        return f"<ProcessingJob(job_id={self.job_id}, status='{self.status.name}')>"

