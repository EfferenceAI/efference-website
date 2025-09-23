"""
Pydantic schemas for API request/response validation.
These schemas define the shape of data coming into and going out of the API.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from db.models import UserRole, VideoSessionStatus, ReviewStatus, ProcessingJobStatus, InvitationStatus


# --- Base Schemas ---

class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    model_config = ConfigDict(from_attributes=True)


# --- User Schemas ---

class UserBase(BaseSchema):
    """Base user schema with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    role: UserRole


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=255)


# Deprecate for now. Users can't sign up with an invitation. Use admin-created invitations instead.

class UserRegisterWithInvitation(BaseSchema):
    """Schema for registering a new user with invitation code"""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=255)
    invitation_code: str = Field(..., min_length=1, max_length=255)


class UserUpdate(BaseSchema):
    """Schema for updating user information"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None


class UserPasswordUpdate(BaseSchema):
    """Schema for updating user password"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=255)


class User(UserBase):
    """Schema for reading user data (response)"""
    user_id: uuid.UUID
    created_at: datetime
    is_invited: bool
    invitation_used_at: Optional[datetime] = None


class UserWithStats(User):
    """User with additional statistics"""
    total_sessions_created: Optional[int] = 0
    total_reviews_submitted: Optional[int] = 0
    total_tasks_assigned: Optional[int] = 0


# --- Invitation Schemas ---

class InvitationBase(BaseSchema):
    """Base invitation schema"""
    email: EmailStr
    role: UserRole


class InvitationCreate(InvitationBase):
    """Schema for creating a new invitation"""
    pass


class InvitationUpdate(BaseSchema):
    """Schema for updating invitation status"""
    status: Optional[InvitationStatus] = None


class Invitation(InvitationBase):
    """Schema for reading invitation data"""
    invitation_id: uuid.UUID
    invitation_code: str
    status: InvitationStatus
    invited_by_id: uuid.UUID
    expires_at: datetime
    created_at: datetime
    sent_at: Optional[datetime] = None
    used_at: Optional[datetime] = None


class InvitationWithInviter(Invitation):
    """Invitation with inviter details"""
    invited_by: User


# --- Task Schemas ---

class TaskBase(BaseSchema):
    """Base task schema"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class TaskCreate(TaskBase):
    """Schema for creating a new task"""
    pass


class TaskUpdate(BaseSchema):
    """Schema for updating a task"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class Task(TaskBase):
    """Schema for reading task data"""
    task_id: uuid.UUID
    created_at: datetime
    created_by_id: uuid.UUID
    creator: Optional[User] = None


class TaskWithAssignments(Task):
    """Task with assignment information"""
    assignments: List["TaskAssignment"] = []


# --- Task Assignment Schemas ---

class TaskAssignmentBase(BaseSchema):
    """Base task assignment schema"""
    task_id: uuid.UUID
    user_id: uuid.UUID


class TaskAssignmentCreate(TaskAssignmentBase):
    """Schema for creating a task assignment"""
    pass


class TaskAssignment(TaskAssignmentBase):
    """Schema for reading task assignment data"""
    assignment_id: uuid.UUID
    assigned_at: datetime
    task: Optional[Task] = None
    user: Optional[User] = None


# --- Video Session Schemas ---

class VideoSessionBase(BaseSchema):
    """Base video session schema"""
    task_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None


class VideoSessionCreate(VideoSessionBase):
    """Schema for creating a new video session"""
    pass


class VideoSessionUpdate(BaseSchema):
    """Schema for updating a video session"""
    reviewer_id: Optional[uuid.UUID] = None
    status: Optional[VideoSessionStatus] = None
    raw_concatenated_s3_key: Optional[str] = None
    processed_1080p_s3_key: Optional[str] = None
    step_function_task_token: Optional[str] = None


class VideoSession(VideoSessionBase):
    """Schema for reading video session data"""
    session_id: uuid.UUID
    creator_id: uuid.UUID
    status: VideoSessionStatus
    raw_concatenated_s3_key: Optional[str] = None
    processed_1080p_s3_key: Optional[str] = None
    step_function_task_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    creator: Optional[User] = None
    task: Optional[Task] = None
    reviewer: Optional[User] = None


class VideoSessionWithDetails(VideoSession):
    """Video session with all related data"""
    raw_clips: List["RawClip"] = []
    processing_jobs: List["ProcessingJob"] = []
    review: Optional["Review"] = None


# --- Raw Clip Schemas ---

class RawClipBase(BaseSchema):
    """Base raw clip schema"""
    session_id: uuid.UUID
    s3_key: str = Field(..., max_length=1024)
    part_number: int = Field(..., ge=1)
    filesize_bytes: Optional[int] = Field(None, ge=0)


class RawClipCreate(RawClipBase):
    """Schema for creating a raw clip record"""
    pass


class RawClipUpdate(BaseSchema):
    """Schema for updating a raw clip"""
    filesize_bytes: Optional[int] = Field(None, ge=0)


class RawClip(RawClipBase):
    """Schema for reading raw clip data"""
    clip_id: uuid.UUID
    upload_completed_at: datetime


# --- Review Schemas ---

class ReviewBase(BaseSchema):
    """Base review schema"""
    session_id: uuid.UUID
    status: ReviewStatus
    comments: Optional[str] = None


class ReviewCreate(ReviewBase):
    """Schema for creating a review"""
    pass


class ReviewUpdate(BaseSchema):
    """Schema for updating a review"""
    status: Optional[ReviewStatus] = None
    comments: Optional[str] = None


class Review(ReviewBase):
    """Schema for reading review data"""
    review_id: uuid.UUID
    reviewer_id: uuid.UUID
    created_at: datetime
    reviewer: Optional[User] = None
    session: Optional[VideoSession] = None


# --- Processing Job Schemas ---

class ProcessingJobBase(BaseSchema):
    """Base processing job schema"""
    session_id: uuid.UUID
    step_function_execution_arn: str = Field(..., max_length=255)
    status: ProcessingJobStatus


class ProcessingJobCreate(ProcessingJobBase):
    """Schema for creating a processing job"""
    pass


class ProcessingJobUpdate(BaseSchema):
    """Schema for updating a processing job"""
    batch_job_id_concat: Optional[str] = Field(None, max_length=255)
    batch_job_id_transcode: Optional[str] = Field(None, max_length=255)
    status: Optional[ProcessingJobStatus] = None
    end_time: Optional[datetime] = None


class ProcessingJob(ProcessingJobBase):
    """Schema for reading processing job data"""
    job_id: uuid.UUID
    batch_job_id_concat: Optional[str] = None
    batch_job_id_transcode: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None


# --- Authentication Schemas ---

class Token(BaseSchema):
    """JWT token response schema"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseSchema):
    """Token payload data"""
    user_id: Optional[uuid.UUID] = None
    email: Optional[str] = None


class LoginRequest(BaseSchema):
    """Login request schema"""
    email: EmailStr
    password: str


# --- API Response Schemas ---

class MessageResponse(BaseSchema):
    """Generic message response"""
    message: str


class ErrorResponse(BaseSchema):
    """Error response schema"""
    detail: str


class PaginatedResponse(BaseSchema):
    """Base schema for paginated responses"""
    total: int
    page: int
    size: int
    pages: int


class PaginatedUsers(PaginatedResponse):
    """Paginated users response"""
    items: List[User]


class PaginatedTasks(PaginatedResponse):
    """Paginated tasks response"""
    items: List[Task]


class PaginatedVideoSessions(PaginatedResponse):
    """Paginated video sessions response"""
    items: List[VideoSession]


# --- File Upload Schemas ---

class PresignedUrlRequest(BaseSchema):
    """Request schema for presigned URL generation"""
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1, max_length=100)
    session_id: uuid.UUID
    part_number: int = Field(..., ge=1)


class PresignedUrlResponse(BaseSchema):
    """Response schema for presigned URL"""
    upload_url: str
    fields: dict
    s3_key: str


class UploadCompleteRequest(BaseSchema):
    """Request schema for upload completion notification"""
    session_id: uuid.UUID
    part_number: int
    s3_key: str
    filesize_bytes: Optional[int] = None


# Forward references for relationships
TaskWithAssignments.model_rebuild()
VideoSessionWithDetails.model_rebuild()