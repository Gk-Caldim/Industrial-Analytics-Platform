from sqlalchemy.orm import Session
from app.models.budget_revision import BudgetRevision
from app.schemas.budget_revision import BudgetRevisionCreate, BudgetRevisionUpdate
from typing import List, Optional

def create_budget_revision(db: Session, obj_in: BudgetRevisionCreate, attachment_data: Optional[bytes] = None) -> BudgetRevision:
    db_obj = BudgetRevision(
        project_id=obj_in.project_id,
        project_name=obj_in.project_name,
        pm_name=obj_in.pm_name,
        previous_budget=obj_in.previous_budget,
        revised_budget=obj_in.revised_budget,
        reasons=obj_in.reasons,
        attachment_data=attachment_data,
        attachment_name=obj_in.attachment_name,
        attachment_type=obj_in.attachment_type,
        status="Pending Head"
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_budget_revisions(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    project_id: Optional[str] = None
) -> List[BudgetRevision]:
    query = db.query(BudgetRevision)
    if status:
        query = query.filter(BudgetRevision.status == status)
    if project_id:
        query = query.filter(BudgetRevision.project_id == project_id)
    return query.order_by(BudgetRevision.created_at.desc()).offset(skip).limit(limit).all()

def get_budget_revision(db: Session, revision_id: int) -> Optional[BudgetRevision]:
    return db.query(BudgetRevision).filter(BudgetRevision.id == revision_id).first()

def update_budget_revision(db: Session, db_obj: BudgetRevision, obj_in: BudgetRevisionUpdate) -> BudgetRevision:
    update_data = obj_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.commit()
    db.refresh(db_obj)
    return db_obj
