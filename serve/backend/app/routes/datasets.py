from fastapi import APIRouter, HTTPException
from typing import List
from app.models import DatasetInfo, DatasetStructure
from app.services.s3_service import s3_service

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("/", response_model=List[DatasetInfo])
async def list_datasets():
    """List all available datasets"""
    try:
        datasets = await s3_service.list_datasets()
        return datasets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing datasets: {str(e)}")

@router.get("/{dataset_name}", response_model=DatasetStructure)
async def get_dataset_structure(dataset_name: str):
    """Get the structure of a specific dataset"""
    try:
        dataset = await s3_service.get_dataset_structure(dataset_name)
        if dataset is None:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return dataset
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="Dataset not found")
        raise HTTPException(status_code=500, detail=f"Error getting dataset structure: {str(e)}")