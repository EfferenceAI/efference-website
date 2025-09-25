"""
User management API endpoints.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.services import crud, schemas, database
from app.db.models import UserRole
from app.services.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(database.get_db)
):
    """Create a new user"""
    # Check if user with email already exists
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return crud.create_user(db=db, user=user)


@router.get("/", response_model=List[schemas.User])
def list_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of users to return"),
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    db: Session = Depends(database.get_db)
):
    """Get a list of users"""
    users = crud.get_users(db, skip=skip, limit=limit, role=role)
    return users


@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get a specific user by ID"""
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return db_user


@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: uuid.UUID,
    user_update: schemas.UserUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a user's information"""
    # Check if email is being updated and is already taken
    if user_update.email:
        existing_user = crud.get_user_by_email(db, email=user_update.email)
        if existing_user and existing_user.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    db_user = crud.update_user(db, user_id=user_id, user_update=user_update)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return db_user


@router.put("/{user_id}/password", response_model=schemas.MessageResponse)
def update_user_password(
    user_id: uuid.UUID,
    password_update: schemas.UserPasswordUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a user's password"""
    db_user = crud.update_user_password(db, user_id=user_id, password_update=password_update)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or current password is incorrect"
        )
    return schemas.MessageResponse(message="Password updated successfully")


@router.delete("/{user_id}", response_model=schemas.MessageResponse)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Delete a user"""
    if not crud.delete_user(db, user_id=user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return schemas.MessageResponse(message="User deleted successfully")


@router.get("/{user_id}/statistics", response_model=dict)
def get_user_statistics(
    user_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get statistics for a specific user"""
    stats = crud.get_user_statistics(db, user_id=user_id)
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return stats


@router.get("/email/{email}", response_model=schemas.User)
def get_user_by_email(
    email: str,
    db: Session = Depends(database.get_db)
):
    """Get a user by email address"""
    db_user = crud.get_user_by_email(db, email=email)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return db_user


# Get logged in user current role
@router.get("/me/role", response_model=UserRole)
def get_current_user_role(current_user: schemas.User = Depends(get_current_user)) -> UserRole:
    return current_user.role