"""
Authentication API endpoints.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from ..services import auth, crud, schemas, database

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=schemas.Token)
def login(
    login_data: schemas.LoginRequest,
    db: Session = Depends(database.get_db)
):
    """Login endpoint to get access token"""
    user = auth.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.user_id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    return schemas.Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=schemas.User)
def get_current_user_info(
    current_user: schemas.User = Depends(auth.get_current_active_user)
):
    """Get current user information"""
    return current_user


@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register(
    user_data: schemas.UserRegisterWithInvitation,
    db: Session = Depends(database.get_db)
):
    """Register a new user with an invitation code."""
    from datetime import datetime

    # Check if user already exists
    existing_user = crud.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate invitation code
    invitation = crud.get_invitation_by_code(db, invitation_code=user_data.invitation_code)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invitation code"
        )

    if invitation.status != schemas.InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code has already been used or expired"
        )

    if invitation.email.lower() != user_data.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code is not valid for this email address"
        )

    if datetime.utcnow() > invitation.expires_at:
        # Auto-expire the invitation
        crud.update_invitation_status(db, invitation.invitation_id, schemas.InvitationStatus.EXPIRED)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation code has expired"
        )

    # Create new user with the role from the invitation
    user_create_data = schemas.UserCreate(
        name=user_data.name,
        email=user_data.email,
        password=user_data.password,
        role=invitation.role
    )
    new_user = crud.create_user(db=db, user=user_create_data)
    
    # Mark user as invited and update invitation status
    new_user.is_invited = True
    new_user.invitation_used_at = datetime.utcnow()
    crud.update_invitation_status(
        db=db,
        invitation_id=invitation.invitation_id,
        status=schemas.InvitationStatus.USED,
        used_at=new_user.invitation_used_at
    )
    
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/change-password", response_model=schemas.MessageResponse)
def change_password(
    password_update: schemas.UserPasswordUpdate,
    current_user: schemas.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Change the current user's password"""
    updated_user = crud.update_user_password(
        db, 
        user_id=current_user.user_id, 
        password_update=password_update
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    return schemas.MessageResponse(message="Password changed successfully")