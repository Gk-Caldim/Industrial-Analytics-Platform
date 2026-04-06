from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

# Set up logging
logger = logging.getLogger(__name__)

from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.schemas.department_column import DepartmentColumnCreate, DepartmentColumnOut, DepartmentColumnUpdate
from app.crud import department as crud_department
from app.crud import department_column as column_crud
from app.core.database import get_db
from app.core.security import get_current_user
from app.utils.audit import log_activity, generate_diff_summary

router = APIRouter(
    prefix="/departments",
    tags=["Departments"]
)

# ============================================================================
# CUSTOM COLUMN ENDPOINTS
# ============================================================================

@router.get("/columns/all", response_model=List[DepartmentColumnOut])
def get_all_columns(db: Session = Depends(get_db)):
    """Get all custom column definitions"""
    columns = column_crud.get_columns(db)
    return columns

@router.post("/columns/create", response_model=DepartmentColumnOut, status_code=status.HTTP_201_CREATED)
def create_column(column: DepartmentColumnCreate, db: Session = Depends(get_db)):
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

@router.put("/columns/{column_id}", response_model=DepartmentColumnOut)
def update_column(
    column_id: int,
    column: DepartmentColumnUpdate,
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
# DEPARTMENT ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[DepartmentResponse])
def list_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_department.get_departments(db, skip=skip, limit=limit)

@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(department_id: int, db: Session = Depends(get_db)):
    db_dept = crud_department.get_department(db, department_id)
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_dept

@router.post("/", response_model=DepartmentResponse)
def add_department(
    dept: DepartmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    new_dept = crud_department.create_department(db, dept)
    
    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="CREATE DEPARTMENT",
        module="Departments",
        entity_id=str(new_dept.id),
        details={
            "targetRole": "Department",
            "summary": f"Created department: {new_dept.department_name}",
            "details": f"New department ID: {new_dept.id}"
        }
    )
    return new_dept

@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int, 
    dept: DepartmentUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_dept_old = crud_department.get_department(db, department_id)
    if not db_dept_old:
        raise HTTPException(status_code=404, detail="Department not found")
        
    diff_summary = generate_diff_summary(db_dept_old, dept)
    
    db_dept = crud_department.update_department(db, department_id, dept)
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="UPDATE DEPARTMENT",
        module="Departments",
        entity_id=str(department_id),
        details={
            "targetRole": "Department",
            "summary": f"Updated {db_dept.department_name}: {diff_summary}",
            "details": f"Modified department record ID: {department_id}"
        }
    )
    return db_dept

@router.delete("/{department_id}", response_model=DepartmentResponse)
def delete_department(
    department_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a department"""
    logger.info(f"Deleting department with ID: {department_id}")
    try:
        db_dept = crud_department.delete_department(db, department_id)
        if not db_dept:
            logger.warning(f"Department with ID {department_id} not found")
            raise HTTPException(status_code=404, detail="Department not found")
            
        # Audit Logging
        log_activity(
            db=db,
            user_id=current_user.get("employee_id") or current_user.get("id"),
            action="DELETE DEPARTMENT",
            module="Departments",
            entity_id=str(department_id),
            details={
                "targetRole": "Department",
                "summary": f"Removed department: {db_dept.department_name}",
                "details": f"Deleted department record ID: {department_id}"
            }
        )
        logger.info(f"Successfully deleted department with ID: {department_id}")
        return db_dept
    except Exception as e:
        logger.error(f"Error deleting department {department_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
