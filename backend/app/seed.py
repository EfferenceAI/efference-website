# Seed initial data into the database

import sys
from sqlalchemy.orm import Session
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db import models
from app.services import crud, schemas
from app.services.auth import get_password_hash
from datetime import datetime, timedelta
import uuid


def seed_data(db: Session):
    # Check if admin user already exists
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    existing_admin = crud.get_user_by_email(db, email=admin_email)
    if not existing_admin:
        # Create admin user
        admin_user = schemas.UserCreate(
            email=admin_email,
            password="admin123",
            name="Admin User",
            role=schemas.UserRole.ADMIN
        )
        crud.create_user(db=db, user=admin_user)
        db.commit()
        print(f"Created admin user with email: {admin_email}")
    else:
        print(f"Admin user with email {admin_email} already exists.")
        db.rollback()

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