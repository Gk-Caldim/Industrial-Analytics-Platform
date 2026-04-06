from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.project_column import ProjectColumnCreate, ProjectColumnUpdate, ProjectColumnOut
from app.crud import project as crud_project
from app.crud import project_column as column_crud
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.audit_log import AuditLog

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

def check_project_permission(db_project, current_user, permission_type: str):
    """
    Check if the current user has permission for the project.
    Permissions are checked in:
    1. Global user role (Admin has all)
    2. Project's manager list
    3. Project's team_lead list
    """
    # 1. Global Admin Check
    if current_user.get("role") == "Admin":
        return True
    
    employee_id = current_user.get("employee_id")
    if not employee_id:
        return False
        
    # 2. Check Manager List
    managers = db_project.manager or []
    for m in managers:
        if str(m.get("employeeId")) == str(employee_id):
            return m.get("permissions", {}).get(permission_type, False)
            
    # 3. Check Team Lead List
    leads = db_project.team_lead or []
    for l in leads:
        if str(l.get("employeeId")) == str(employee_id):
            return l.get("permissions", {}).get(permission_type, False)
            
    return False

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all projects, filtered by user permissions"""
    projects = crud_project.get_projects(db)
    
    # 1. Admin returns all
    if current_user.get("role") == "Admin":
        return projects
        
    # 2. Others filter by "view" permission
    return [p for p in projects if check_project_permission(p, current_user, "view")]

@router.post("/", response_model=ProjectResponse)
def add_project(
    project: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a new project - Restricted to Admins"""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can create projects")
    db_project = crud_project.create_project(db, project)
    
    # Audit Log
    db.add(AuditLog(
        user_id=current_user.get("employee_id") or "System",
        action="CREATED",
        module="Project Master",
        entity_id=db_project.project_id,
        details={"name": db_project.name, "manager": db_project.manager}
    ))
    db.commit()
    
    return db_project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a single project with permission check"""
    db_project = crud_project.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not check_project_permission(db_project, current_user, "view"):
        raise HTTPException(status_code=403, detail="You do not have permission to view this project")
        
    return db_project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int, 
    project: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_project = crud_project.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_permission(db_project, current_user, "edit"):
        raise HTTPException(status_code=403, detail="You do not have permission to edit this project")
        
    updated_project = crud_project.update_project(db, project_id, project)
    
    # Audit Log
    db.add(AuditLog(
        user_id=current_user.get("employee_id") or "System",
        action="UPDATED",
        module="Project Master",
        entity_id=updated_project.project_id,
        details={"name": updated_project.name, "status": updated_project.status}
    ))
    db.commit()
    
    return updated_project

@router.delete("/{project_id}")
def delete_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_project = crud_project.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_permission(db_project, current_user, "delete"):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this project")

    try:
        project_id_str = db_project.project_id
        success = crud_project.delete_project(db, project_id)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
            
        # Audit Log
        db.add(AuditLog(
            user_id=current_user.get("employee_id") or "System",
            action="DELETED",
            module="Project Master",
            entity_id=project_id_str,
            details={"name": db_project.name}
        ))
        db.commit()
        
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
def bulk_delete_projects(
    project_ids: List[int], 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Check permissions for all projects first
    for pid in project_ids:
        db_project = crud_project.get_project(db, pid)
        if db_project and not check_project_permission(db_project, current_user, "delete"):
            raise HTTPException(
                status_code=403, 
                detail=f"You do not have permission to delete project with ID {pid}"
            )

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
