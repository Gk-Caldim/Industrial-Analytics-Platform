from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.project_sub_category import SubCategoryCreate, SubCategoryUpdate, SubCategoryResponse
from app.crud import project_sub_category as crud
from app.core.database import get_db

router = APIRouter(
    prefix="/project-sub-categories",
    tags=["Project Sub Categories"]
)

@router.get("/{project_id}", response_model=List[SubCategoryResponse])
def list_sub_categories(project_id: str, db: Session = Depends(get_db)):
    """List all sub-categories for a given project_id (string)"""
    return crud.get_sub_categories_by_project(db, project_id)

@router.post("/", response_model=SubCategoryResponse)
def add_sub_category(sub_category: SubCategoryCreate, db: Session = Depends(get_db)):
    """Add a new sub-category"""
    return crud.create_sub_category(db, sub_category)

@router.put("/{sub_category_id}", response_model=SubCategoryResponse)
def update_sub_category(sub_category_id: int, sub_category: SubCategoryUpdate, db: Session = Depends(get_db)):
    """Update a sub-category"""
    db_sub = crud.update_sub_category(db, sub_category_id, sub_category)
    if db_sub is None:
        raise HTTPException(status_code=404, detail="Sub-category not found")
    return db_sub

@router.delete("/{sub_category_id}")
def delete_sub_category(sub_category_id: int, db: Session = Depends(get_db)):
    """Delete a sub-category"""
    success = crud.delete_sub_category(db, sub_category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sub-category not found")
    return {"message": "Sub-category deleted successfully"}
