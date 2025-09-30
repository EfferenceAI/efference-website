"""
Task management API endpoints.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.services import crud, schemas, database
from app.db import models
from app.db.models import UserRole, TaskApplicationStatus, TaskRequestStatus
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


@router.post("/activate-all", response_model=schemas.MessageResponse)
def activate_all_tasks(
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Activate all existing tasks (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can activate tasks"
        )
    
    # Update all tasks to be active
    updated_count = db.query(models.Task).update({models.Task.is_active: True})
    db.commit()
    
    return schemas.MessageResponse(message=f"Activated {updated_count} tasks")


# Workers can apply for tasks, and then they get assigned to that task upon approval
@router.post("/{task_id}/assignments", response_model=schemas.TaskAssignment, status_code=status.HTTP_201_CREATED)
def create_task_assignment(
    task_id: uuid.UUID,
    user_id: uuid.UUID = Query(..., description="ID of the worker to assign to this task"),
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Assign a task to a worker (admin only)."""
    # AuthZ: only admins can assign
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign tasks"
        )

    # Verify task exists
    task = crud.get_task(db, task_id=task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Verify assignee exists and is a worker
    assignee = crud.get_user(db, user_id=user_id)
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignee not found"
        )
    if assignee.role != UserRole.WORKER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be a WORKER"
        )

    assignment_data = schemas.TaskAssignmentCreate(task_id=task_id, user_id=user_id)
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


# --- Task Applications Flow ---

@router.post("/requests/{request_id}/apply", response_model=schemas.TaskApplication, status_code=status.HTTP_201_CREATED)
def apply_to_task(
    request_id: uuid.UUID,
    application: schemas.TaskApplicationCreate,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Worker applies to a client's task request."""
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only workers can apply to requests")

    # Ensure the path param and body request_id align; prefer path
    app_in = application
    if application.request_id != request_id:
        app_in = schemas.TaskApplicationCreate(request_id=request_id)

    # Ensure request exists and is OPEN
    req = crud.get_task_request(db, request_id=request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Task request not found")
    if req.status != TaskRequestStatus.OPEN:
        raise HTTPException(status_code=400, detail="Request is not open for applications")

    return crud.create_task_application(db, app_in, user_id=current_user.user_id)


@router.get("/requests/{request_id}/applications", response_model=List[schemas.TaskApplication])
def list_task_applications(
    request_id: uuid.UUID,
    status_filter: Optional[TaskApplicationStatus] = Query(None),
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Admin lists applications for a task request."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view applications")
    return crud.get_task_applications(db, request_id=request_id, status=status_filter)


@router.post("/applications/{application_id}/approve", response_model=schemas.TaskApplication)
def approve_task_application(
    application_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Admin approves an application; assigns worker to request and creates a task assignment."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can approve applications")
    app = crud.decide_task_application(db, application_id=application_id, approver_id=current_user.user_id, approve=True)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post("/applications/{application_id}/reject", response_model=schemas.TaskApplication)
def reject_task_application(
    application_id: uuid.UUID,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Admin rejects an application."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can reject applications")
    app = crud.decide_task_application(db, application_id=application_id, approver_id=current_user.user_id, approve=False)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


# --- Client Task Requests ---

@router.post("/{task_id}/requests", response_model=schemas.TaskRequest, status_code=status.HTTP_201_CREATED)
def create_task_request(
    task_id: uuid.UUID,
    req: schemas.TaskRequestCreate,
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Client creates a request for a given task template with address/other info."""
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clients can create task requests")
    # Ensure body uses path task_id
    req_in = req if req.task_id == task_id else schemas.TaskRequestCreate(task_id=task_id, address=req.address, other_info=req.other_info)
    # Ensure task exists
    task = crud.get_task(db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.create_task_request(db, req_in, client_id=current_user.user_id)


@router.get("/{task_id}/requests", response_model=List[schemas.TaskRequest])
def list_task_requests(
    task_id: uuid.UUID,
    status_filter: Optional[TaskRequestStatus] = Query(None),
    db: Session = Depends(database.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    """Admins can view all requests for a task; clients can view their own created requests."""
    if current_user.role == UserRole.ADMIN:
        return crud.get_task_requests(db, task_id=task_id, status=status_filter)
    if current_user.role == UserRole.CLIENT:
        return [r for r in crud.get_task_requests(db, client_id=current_user.user_id, task_id=task_id, status=status_filter)]
    raise HTTPException(status_code=403, detail="Not authorized to view requests")