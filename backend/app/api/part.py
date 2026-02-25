from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.part import PartCreate, PartResponse, PartUpdate
from app.schemas.part_column import PartColumnCreate, PartColumnOut, PartColumnUpdate
from app.crud import part as crud_part
from app.crud import part_column as column_crud
from app.core.database import get_db

router = APIRouter(
    prefix="/parts",
    tags=["Parts"]
)

# ============================================================================
# CUSTOM COLUMN ENDPOINTS
# ============================================================================

@router.get("/columns/all", response_model=List[PartColumnOut])
def get_all_columns(db: Session = Depends(get_db)):
    """Get all custom column definitions"""
    columns = column_crud.get_columns(db)
    return columns

@router.post("/columns/create", response_model=PartColumnOut, status_code=status.HTTP_201_CREATED)
def create_column(column: PartColumnCreate, db: Session = Depends(get_db)):
    """Create a new custom column"""
    # Check if column name already exists
    existing_column = column_crud.get_column_by_name(db, column.column_name)
    if existing_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Column with name '{column.column_name}' already exists"
        )
    
    try:
        new_column = column_crud.create_column(db, column)
        return new_column
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating column: {str(e)}"
        )

@router.put("/columns/{column_id}", response_model=PartColumnOut)
def update_column(
    column_id: int,
    column: PartColumnUpdate,
    db: Session = Depends(get_db)
):
    """Update a custom column"""
    try:
        updated_column = column_crud.update_column(db, column_id, column)
        if not updated_column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column with id {column_id} not found"
            )
        return updated_column
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating column: {str(e)}"
        )

@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(column_id: int, db: Session = Depends(get_db)):
    """Delete a custom column"""
    success = column_crud.delete_column(db, column_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Column with id {column_id} not found"
        )
    return None

# ============================================================================
# PART ENDPOINTS
# ============================================================================

@router.get("", response_model=List[PartResponse])
def list_parts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all parts"""
    return crud_part.get_parts(db, skip=skip, limit=limit)

@router.get("/{part_id}", response_model=PartResponse)
def get_part(part_id: str, db: Session = Depends(get_db)):
    """Get a specific part"""
    db_part = crud_part.get_part(db, part_id)
    if not db_part:
        raise HTTPException(status_code=404, detail="Part not found")
    return db_part

@router.post("", response_model=PartResponse)
def add_part(part: PartCreate, db: Session = Depends(get_db)):
    """Add a new part. Extra fields will be stored in custom_attributes."""
    if crud_part.get_part(db, part.id):
        raise HTTPException(status_code=400, detail="Part ID already exists")
    return crud_part.create_part(db, part)

@router.put("/{part_id}", response_model=PartResponse)
def update_part(part_id: str, part: PartUpdate, db: Session = Depends(get_db)):
    """Update a part. Extra fields will be merged into custom_attributes."""
    db_part = crud_part.update_part(db, part_id, part)
    if not db_part:
        raise HTTPException(status_code=404, detail="Part not found")
    return db_part

@router.delete("/{part_id}", response_model=PartResponse)
def delete_part(part_id: str, db: Session = Depends(get_db)):
    """Delete a part"""
    db_part = crud_part.delete_part(db, part_id)
    if not db_part:
        raise HTTPException(status_code=404, detail="Part not found")
    return db_part
