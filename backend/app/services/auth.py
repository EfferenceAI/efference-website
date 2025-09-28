"""
Authentication and authorization utilities.
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session


from . import crud, database, schemas
from ..db.models import User, UserRole

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Get password hash"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[schemas.TokenData]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None or email is None:
            return None
        
        token_data = schemas.TokenData(
            user_id=uuid.UUID(user_id),
            email=email
        )
        return token_data
    except (JWTError, ValueError):
        return None


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    from . import crud
    user = crud.get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(database.get_db)
) -> User:
    """Get the current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    from . import crud
    user = crud.get_user(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_invited_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Get the current user and ensure they have been invited.
    This is used to protect endpoints that require a user to have been
    explicitly invited, such as file uploads.
    """
    if not current_user.is_invited:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this feature requires an invitation. Please contact an administrator."
        )
    return current_user


# Role-based authorization decorators
class RequireRole:
    """Dependency class to require specific user roles"""
    
    def __init__(self, *allowed_roles: UserRole):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of these roles: {[str(role) for role in self.allowed_roles]}"
            )
        return current_user


# Convenience functions for common role requirements
require_admin = RequireRole(UserRole.ADMIN)
require_trainer = RequireRole(UserRole.TRAINER)
require_reviewer = RequireRole(UserRole.REVIEWER)
require_admin_or_trainer = RequireRole(UserRole.ADMIN, UserRole.TRAINER)
require_admin_or_reviewer = RequireRole(UserRole.ADMIN, UserRole.REVIEWER)


def get_current_user_id(current_user: User = Depends(get_current_active_user)) -> uuid.UUID:
    """Get the current user's ID"""
    return current_user.user_id



async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(database.get_db)
) -> Optional[User]:
    """Get the current user if authenticated, otherwise None"""
    if not credentials:
        return None
    
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        return None
    
    from . import crud
    user = crud.get_user(db, user_id=token_data.user_id)
    return user