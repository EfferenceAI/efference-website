"""
Review management API endpoints.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.services import crud, schemas, database

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("/", response_model=schemas.Review, status_code=status.HTTP_201_CREATED)
def create_review(
    review: schemas.ReviewCreate,
    reviewer_id: uuid.UUID = Query(..., description="ID of the reviewer submitting the review"),
    db: Session = Depends(database.get_db)
):
    """Create a new review"""
    # Verify that the reviewer exists
    reviewer = crud.get_user(db, user_id=reviewer_id)
    if not reviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reviewer not found"
        )
    
    # Verify that the session exists
    session = crud.get_video_session(db, session_id=review.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    
    # Check if review already exists for this session
    existing_review = crud.get_review_by_session(db, session_id=review.session_id)
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already exists for this session"
        )
    
    # Verify the session is in the correct status for review
    # if session.status not in [VideoSessionStatus.PENDING_REVIEW]:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Session is not ready for review"
    #     )
    
    return crud.create_review(db=db, review=review, reviewer_id=reviewer_id)


@router.get("/", response_model=List[schemas.Review])
def list_reviews(
    skip: int = Query(0, ge=0, description="Number of reviews to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of reviews to return"),
    reviewer_id: Optional[uuid.UUID] = Query(None, description="Filter by reviewer ID"),
    db: Session = Depends(database.get_db)
):
    """Get a list of reviews"""
    reviews = crud.get_reviews(db, skip=skip, limit=limit, reviewer_id=reviewer_id)
    return reviews


@router.get("/{review_id}", response_model=schemas.Review)
def get_review(
    review_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get a specific review by ID"""
    db_review = crud.get_review(db, review_id=review_id)
    if db_review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    return db_review


@router.get("/session/{session_id}", response_model=schemas.Review)
def get_review_by_session(
    session_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get the review for a specific video session"""
    # Verify session exists
    session = crud.get_video_session(db, session_id=session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video session not found"
        )
    
    db_review = crud.get_review_by_session(db, session_id=session_id)
    if db_review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found for this session"
        )
    return db_review


@router.put("/{review_id}", response_model=schemas.Review)
def update_review(
    review_id: uuid.UUID,
    review_update: schemas.ReviewUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a review"""
    db_review = crud.update_review(db, review_id=review_id, review_update=review_update)
    if db_review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    return db_review


@router.delete("/{review_id}", response_model=schemas.MessageResponse)
def delete_review(
    review_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Delete a review"""
    if not crud.delete_review(db, review_id=review_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    return schemas.MessageResponse(message="Review deleted successfully")