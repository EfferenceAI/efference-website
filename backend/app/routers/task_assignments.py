"""
Task Assignment API endpoints.
Provides standalone endpoints for task assignment management.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.services import crud, schemas, database
from app.db.models import UserRole
from app.services.auth import get_current_user

router = APIRouter(prefix="/task-assignments", tags=["task-assignments"])


@router.get("/", response_model=List[schemas.TaskAssignment])
def list_all_task_assignments(
    task_id: uuid.UUID = Query(None, description="Filter by task ID"),
    user_id: uuid.UUID = Query(None, description="Filter by user ID"),
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Get all task assignments with optional filtering"""
    # Allow admins to see all assignments, workers to see their own
    if current_user.role == UserRole.ADMIN:
        return crud.get_all_task_assignments(db, task_id=task_id, user_id=user_id)
    elif current_user.role == UserRole.WORKER:
        # Workers can only see their own assignments
        return crud.get_all_task_assignments(db, task_id=task_id, user_id=current_user.user_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view task assignments"
        )


@router.post("/", response_model=schemas.TaskAssignment, status_code=status.HTTP_201_CREATED)
def create_task_assignment(
    assignment: schemas.TaskAssignmentCreate,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Create a new task assignment (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create task assignments"
        )

    # Verify task exists
    task = crud.get_task(db, task_id=assignment.task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Verify assignee exists and is a worker
    assignee = crud.get_user(db, user_id=assignment.user_id)
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if assignee.role != UserRole.WORKER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be a WORKER"
        )

    # Check if assignment already exists
    existing = crud.get_task_assignment_by_task_and_user(db, task_id=assignment.task_id, user_id=assignment.user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task assignment already exists"
        )

    return crud.create_task_assignment(db=db, assignment=assignment)


@router.delete("/{assignment_id}", response_model=schemas.MessageResponse)
def delete_task_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Delete a task assignment (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete task assignments"
        )

    if not crud.delete_task_assignment(db, assignment_id=assignment_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task assignment not found"
        )
    
    return schemas.MessageResponse(message="Task assignment deleted successfully")


@router.get("/{assignment_id}", response_model=schemas.TaskAssignment)
def get_task_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Get a specific task assignment"""
    assignment = crud.get_task_assignment(db, assignment_id=assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task assignment not found"
        )

    # Check permissions: admins see all, workers see only their own
    if current_user.role != UserRole.ADMIN and assignment.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this assignment"
        )

    return assignment