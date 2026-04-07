from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import check_permissions
from app.crud import budget_revision as crud
from app.schemas.budget_revision import BudgetRevisionCreate, BudgetRevisionResponse, BudgetRevisionUpdate
from app.models.project import Project
from app.models.budget import BudgetSummary
import re
from fastapi.responses import Response

router = APIRouter(prefix="/budget/revisions", tags=["Budget Revisions"])

@router.post("/", response_model=BudgetRevisionResponse)
async def submit_revision(
    project_id: str = Form(...),
    project_name: str = Form(...),
    pm_name: str = Form(...),
    previous_budget: float = Form(...),
    revised_budget: float = Form(...),
    reasons: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Permission check
    # Note: Project Manager role should have 'request_revision' permission
    
    attachment_data = None
    attachment_name = None
    attachment_type = None
    
    if file:
        attachment_data = await file.read()
        attachment_name = file.filename
        attachment_type = file.content_type
        
    obj_in = BudgetRevisionCreate(
        project_id=project_id,
        project_name=project_name,
        pm_name=pm_name,
        previous_budget=previous_budget,
        revised_budget=revised_budget,
        reasons=reasons,
        attachment_name=attachment_name,
        attachment_type=attachment_type
    )
    
    return crud.create_budget_revision(db=db, obj_in=obj_in, attachment_data=attachment_data)

@router.get("/", response_model=List[BudgetRevisionResponse])
def list_revisions(
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Logic to restrict revisions based on user role and project assignment
    # If Head, they should see 'Pending Head'
    # If Finance, they should see 'Pending Finance'
    # If PM, they see theirs
    
    user_role = current_user.get("role")
    
    # Simple role-based filtering for now
    if user_role == "Head" and not status:
        status = "Pending Head"
    elif user_role == "Finance" and not status:
        status = "Pending Finance"
    
    return crud.get_budget_revisions(db=db, status=status, project_id=project_id)

@router.patch("/{revision_id}", response_model=BudgetRevisionResponse)
def update_revision_status(
    revision_id: int,
    obj_in: BudgetRevisionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_obj = crud.get_budget_revision(db, revision_id=revision_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Revision request not found")
        
    # Logic for status transitions
    # Pending Head -> Pending Finance (Head clicks Review to Finance)
    # Pending Finance -> Approved/Declined (Finance clicks Approve/Decline)
    
    old_status = db_obj.status
    new_status = obj_in.status
    
    updated_obj = crud.update_budget_revision(db=db, db_obj=db_obj, obj_in=obj_in)
    
    # If Approved, update the Project budget
    if new_status == "Approved" and old_status != "Approved":
        project = db.query(Project).filter(Project.project_id == db_obj.project_id).first()
        if project:
            project.budget = db_obj.revised_budget
            # Also update balance
            project.balance_budget = project.budget - project.utilized_budget
            db.commit()
            
    return updated_obj

@router.get("/{revision_id}/attachment")
def download_attachment(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_obj = crud.get_budget_revision(db, revision_id=revision_id)
    if not db_obj or not db_obj.attachment_data:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    return Response(
        content=db_obj.attachment_data,
        media_type=db_obj.attachment_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={db_obj.attachment_name or 'attachment'}"
        }
    )
