from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.project_column import ProjectColumnCreate, ProjectColumnUpdate, ProjectColumnOut
from app.crud import project as crud_project
from app.crud import project_column as column_crud
from app.core.database import get_db

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return crud_project.get_projects(db)

@router.post("/", response_model=ProjectResponse)
def add_project(project: ProjectCreate, db: Session = Depends(get_db)):
    return crud_project.create_project(db, project)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud_project.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = crud_project.update_project(db, project_id, project)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    try:
        success = crud_project.delete_project(db, project_id)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted successfully"}
    except Exception as e:
        # Handle foreign key constraint violation specifically
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower() or "violates foreign key constraint" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete project because it is being referenced by other records (like Trackers). Please delete those records first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting project: {error_msg}"
            )

@router.post("/bulk-delete")
def bulk_delete_projects(project_ids: List[int], db: Session = Depends(get_db)):
    try:
        success = crud_project.bulk_delete_projects(db, project_ids)
        if not success:
            raise HTTPException(status_code=404, detail="One or more projects not found")
        return {"message": f"{len(project_ids)} projects deleted successfully"}
    except Exception as e:
        # Handle foreign key constraint violation
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower() or "violates foreign key constraint" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some projects cannot be deleted because they are referenced by other records (like Trackers). Please delete those records first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error bulk deleting projects: {error_msg}"
            )

# ============================================================================
# CUSTOM COLUMN ENDPOINTS
# ============================================================================

@router.get("/columns/all", response_model=List[ProjectColumnOut])
def get_all_columns(db: Session = Depends(get_db)):
    """Get all custom column definitions"""
    columns = column_crud.get_columns(db)
    return columns

@router.post("/columns/create", response_model=ProjectColumnOut, status_code=status.HTTP_201_CREATED)
def create_column(column: ProjectColumnCreate, db: Session = Depends(get_db)):
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

@router.put("/columns/{column_id}", response_model=ProjectColumnOut)
def update_column(
    column_id: int,
    column: ProjectColumnUpdate,
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
