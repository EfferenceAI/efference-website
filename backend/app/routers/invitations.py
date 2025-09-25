"""
Invitation management API endpoints.
Handles invitation creation, sending, and validation for user access control.
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.services import crud, schemas, database
from app.db.models import UserRole, InvitationStatus
from app.services.auth import get_current_user, RequireRole
from app.services.email import send_email


router = APIRouter(
    prefix="/invitations",
    tags=["invitations"],
    dependencies=[Depends(RequireRole(UserRole.ADMIN))]  # Only admins can manage invitations
)


@router.post("/", response_model=schemas.Invitation, status_code=status.HTTP_201_CREATED)
def create_invitation(
    invitation: schemas.InvitationCreate,
    expires_in_days: int = 7,  # Default 7 days expiry
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Create a new invitation code for a user to join the platform.
    Only admins can create invitations.
    """
    #print("Create invitation endpoint called")
    if expires_in_days < 1 or expires_in_days > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry must be between 1 and 30 days"
        )
    
    expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    # Check if user with this email already exists
    existing_user = crud.get_user_by_email(db, invitation.email)
    if existing_user and getattr(existing_user, "is_invited", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists and has already used an invitation"
        )
    
    # Check if there's already a pending invitation for this email
    existing_invitations = crud.get_invitations(db, status=InvitationStatus.PENDING)
    for inv in existing_invitations:
        if inv.email == invitation.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pending invitation already exists for this email"
            )
    
    db_invitation = crud.create_invitation(
        db=db,
        invitation=invitation,
        invited_by_id=current_user.user_id,
        expires_at=expires_at
    )
    return db_invitation


@router.get("/", response_model=List[schemas.Invitation])
def get_invitations(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[InvitationStatus] = None,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Get all invitations with optional filtering.
    Only admins can view invitations.
    """
    return crud.get_invitations(
        db=db,
        skip=skip,
        limit=limit,
        status=status_filter,
        invited_by_id=current_user.user_id if current_user.role != UserRole.ADMIN else None
    )


@router.get("/{invitation_id}", response_model=schemas.InvitationWithInviter)
def get_invitation(
    invitation_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Get a specific invitation by ID.
    Only admins can view invitations.
    """
    db_invitation = crud.get_invitation(db, invitation_id=invitation_id)
    if db_invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return db_invitation


@router.put("/{invitation_id}", response_model=schemas.Invitation)
def update_invitation(
    invitation_id: uuid.UUID,
    invitation_update: schemas.InvitationUpdate,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Update invitation status.
    Only admins can update invitations.
    """
    db_invitation = crud.get_invitation(db, invitation_id=invitation_id)
    if db_invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation_update.status is not None:
        used_at = datetime.utcnow() if invitation_update.status == InvitationStatus.USED else None
        updated_invitation = crud.update_invitation_status(
            db=db,
            invitation_id=invitation_id,
            status=invitation_update.status,
            used_at=used_at
        )
        if updated_invitation is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        return updated_invitation
    
    return db_invitation


@router.delete("/{invitation_id}", response_model=schemas.MessageResponse)
def delete_invitation(
    invitation_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Delete an invitation.
    Only admins can delete invitations.
    """
    success = crud.delete_invitation(db, invitation_id=invitation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    return schemas.MessageResponse(message="Invitation deleted successfully")


@router.post("/{invitation_code}/send", response_model=schemas.MessageResponse)
def send_invitation_email(
    invitation_code: str,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Send invitation email via Amazon SES.
    Only admins can send invitation emails.
    """
    db_invitation = crud.get_invitation_by_code(db, invitation_code=invitation_code)
    if db_invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if db_invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has already been sent or used"
        )
    
    
    #crud.mark_invitation_sent(db, db_invitation.invitation_id)
    try: 
        send_email(
    to_address=db_invitation.email,
    subject="You're Invited to Join Efference Video Training Platform",
    body=f"""
<html>
  <body style="font-family: Arial, sans-serif; color: #222;">
    <h2>You're Invited!</h2>
    <p>
      You have been invited to join the <strong>Efference Video Training Platform</strong>!
    </p>
    <p>
      <strong>Your invitation code:</strong>
      <br>
      <span style="display:inline-block; margin:12px 0; padding:12px 24px; background:#f5f5f5; border-radius:8px; font-size:1.3em; letter-spacing:2px; font-weight:bold; color:#2a4d8f;">
        {db_invitation.invitation_code}
      </span>
    </p>
    <p>
      <strong>Expires:</strong> {db_invitation.expires_at:%Y-%m-%d %H:%M UTC}
    </p>
    <p>
      To register, visit:<br>
      <a href="https://efference.com/register" style="color:#2a4d8f;">https://efference.com/register</a><br>
      and enter your invitation code.
    </p>
    <hr>
    <p>
      Best regards,<br>
      <strong>Efference Team</strong>
    </p>
  </body>
</html>
"""
)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation email: {str(e)}"
        )
    
    return schemas.MessageResponse(message="Invitation email sent successfully")


# Public endpoint for validating invitation codes (no auth required)
@router.get("/validate/{invitation_code}", response_model=schemas.Invitation)
def validate_invitation_code(
    invitation_code: str,
    db: Session = Depends(database.get_db)
):
    """
    Validate an invitation code.
    This endpoint is public and doesn't require authentication.
    """
    db_invitation = crud.get_invitation_by_code(db, invitation_code=invitation_code)
    if db_invitation is None:
        raise HTTPException(status_code=404, detail="Invalid invitation code")
    
    if db_invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code has expired or been used"
        )
    
    if datetime.utcnow() > db_invitation.expires_at:
        # Auto-expire the invitation
        crud.update_invitation_status(db, db_invitation.invitation_id, InvitationStatus.EXPIRED)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code has expired"
        )
    
    return db_invitation
