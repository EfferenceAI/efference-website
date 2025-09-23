"""
Database configuration and session management for the FastAPI application.
"""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from .db.base import Base

# Database URL - can be overridden by environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://user:password@localhost:5432/efference_db"
)

# For SQLite in development (optional)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,    # Recycle connections every 5 minutes
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get a database session.
    This will be used in FastAPI endpoints via Depends().
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Create all tables. This is mainly for testing purposes.
    In production, use Alembic migrations instead.
    """
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """
    Drop all tables. This is mainly for testing purposes.
    """
    Base.metadata.drop_all(bind=engine)