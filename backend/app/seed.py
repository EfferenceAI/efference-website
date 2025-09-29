"""Seed initial data into the database for local/dev usage.

Creates:
- Users: Admin, Worker, Client, Reviewer (idempotent)
- A couple of Task templates (created by Admin)
- One TaskRequest by the Client for a Task
- One TaskApplication by the Worker for that request
- Approves the application (assigns Worker and creates TaskAssignment)
"""

import sys
from sqlalchemy.orm import Session
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db import models
from app.services import crud, schemas
from datetime import datetime


def get_or_create_user(db: Session, *, email: str, name: str, role: schemas.UserRole, password: str) -> models.User:
    user = crud.get_user_by_email(db, email=email)
    if user:
        print(f"User exists: {email} ({role.name})")
        return user
    created = crud.create_user(db, schemas.UserCreate(
        name=name,
        email=email,
        password=password,
        role=role,
        phone_number=None,
        age=None,
        sex=None,
    ))
    print(f"Created user: {email} ({role.name})")
    return created


def seed_data(db: Session):
    # 1) Users
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    worker_email = os.getenv("WORKER_EMAIL", "worker@example.com")
    client_email = os.getenv("CLIENT_EMAIL", "client@example.com")
    reviewer_email = os.getenv("REVIEWER_EMAIL", "reviewer@example.com")

    admin = get_or_create_user(db, email=admin_email, name="Admin User", role=schemas.UserRole.ADMIN, password="admin123")
    worker = get_or_create_user(db, email=worker_email, name="Worker One", role=schemas.UserRole.WORKER, password="worker123")
    client = get_or_create_user(db, email=client_email, name="Client One", role=schemas.UserRole.CLIENT, password="client123")
    reviewer = get_or_create_user(db, email=reviewer_email, name="Reviewer One", role=schemas.UserRole.REVIEWER, password="reviewer123")

    # 2) Tasks (templates)
    task_titles = [
        ("House Cleaning", "General cleaning task template."),
        ("Furniture Assembly", "Assemble flat-pack furniture safely."),
    ]
    tasks_by_title = {}
    for title, description in task_titles:
        existing = db.query(models.Task).filter(models.Task.title == title).first()
        if existing:
            print(f"Task exists: {title}")
            tasks_by_title[title] = existing
            continue
        created = crud.create_task(db, schemas.TaskCreate(title=title, description=description, is_active=True), created_by_id=admin.user_id)
        print(f"Created task: {title}")
        tasks_by_title[title] = created

    # 3) Client Task Request for first task
    first_task = tasks_by_title[task_titles[0][0]]
    address = os.getenv("SEED_REQUEST_ADDRESS", "123 Demo Street, Demo City")
    existing_request = db.query(models.TaskRequest).filter(
        models.TaskRequest.task_id == first_task.task_id,
        models.TaskRequest.client_id == client.user_id,
        models.TaskRequest.address == address,
    ).first()
    if existing_request:
        task_request = existing_request
        print(f"TaskRequest exists for {first_task.title} at '{address}'")
    else:
        task_request = crud.create_task_request(db, schemas.TaskRequestCreate(task_id=first_task.task_id, address=address, other_info="Please come on Saturday."), client_id=client.user_id)
        print(f"Created TaskRequest for {first_task.title} by {client.email}")

    # 4) Worker applies to the client's request
    application = crud.create_task_application(db, schemas.TaskApplicationCreate(request_id=task_request.request_id), user_id=worker.user_id)
    print(f"Worker applied to request: application_id={application.application_id}")

    # 5) Admin approves the application (assign request + create TaskAssignment)
    if application.status == models.TaskApplicationStatus.PENDING:
        approved = crud.decide_task_application(db, application_id=application.application_id, approver_id=admin.user_id, approve=True)
        print(f"Approved application: {approved.application_id}. Request assigned to worker.")
    else:
        print(f"Application already decided: status={application.status.name}")

def main():
    from app.services.database import SessionLocal, engine
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()

if __name__ == "__main__":
    main()