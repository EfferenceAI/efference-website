"""
Task management API endpoints.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.services import crud, schemas, database
from app.routers.users import get_current_user_role
from app.db.models import UserRole
from app.services.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Create a new task"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create tasks"
        )
    return crud.create_task(db=db, task=task, created_by_id=current_user.user_id)

@router.get("/", response_model=List[schemas.Task])
def list_tasks(
    skip: int = Query(0, ge=0, description="Number of tasks to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of tasks to return"),
    created_by_id: Optional[uuid.UUID] = Query(None, description="Filter by creator ID"),
    db: Session = Depends(database.get_db)
):
    """Get a list of tasks"""
    tasks = crud.get_tasks(db, skip=skip, limit=limit, created_by_id=created_by_id)
    return tasks


@router.get("/{task_id}", response_model=schemas.Task)
def get_task(
    task_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get a specific task by ID"""
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return db_task


@router.put("/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: uuid.UUID,
    task_update: schemas.TaskUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a task"""
    db_task = crud.update_task(db, task_id=task_id, task_update=task_update)
    if db_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return db_task


@router.delete("/{task_id}", response_model=schemas.MessageResponse)
def delete_task(
    task_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Delete a task"""
    if not crud.delete_task(db, task_id=task_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return schemas.MessageResponse(message="Task deleted successfully")


# --- Task Assignment Endpoints ---

@router.post("/{task_id}/assignments", response_model=schemas.TaskAssignment, status_code=status.HTTP_201_CREATED)
def create_task_assignment(
    task_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Assign a task to a user"""
    # Verify task exists
    task = crud.get_task(db, task_id=task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_user.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only trainers can be assigned tasks"
        )

    assignment_data = schemas.TaskAssignmentCreate(task_id=task_id, user_id=current_user.user_id)
    return crud.create_task_assignment(db=db, assignment=assignment_data)


@router.get("/{task_id}/assignments", response_model=List[schemas.TaskAssignment])
def list_task_assignments(
    task_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Get all assignments for a specific task"""
    # Verify task exists
    task = crud.get_task(db, task_id=task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return crud.get_task_assignments(db, task_id=task_id)


@router.delete("/assignments/{assignment_id}", response_model=schemas.MessageResponse)
def delete_task_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(database.get_db)
):
    """Remove a task assignment"""
    if not crud.delete_task_assignment(db, assignment_id=assignment_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task assignment not found"
        )
    return schemas.MessageResponse(message="Task assignment removed successfully")