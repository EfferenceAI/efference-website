"""
Dashboard and statistics API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.services import crud, database

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/statistics")
def get_dashboard_statistics(
    db: Session = Depends(database.get_db)
):
    """Get overall dashboard statistics"""
    return crud.get_dashboard_statistics(db)