from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.audit_log import AuditLogCreate, AuditLogResponse
from app.models.audit_log import AuditLog
from app.core.database import get_db
from app.core.security import get_current_user
from sqlalchemy import desc

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)

@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    module: str = None,
    entity_id: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get audit logs, optionally filtered by module and entity_id"""
    query = db.query(AuditLog)
    if module:
        query = query.filter(AuditLog.module == module)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
        
    logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return logs

@router.post("/", response_model=AuditLogResponse)
def create_audit_log(
    log: AuditLogCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a manual audit log entry"""
    # In practice, usually services write to audit logs, but having an API allows frontend to push logs contextually
    new_log = AuditLog(
        user_id=log.user_id or current_user.get("employee_id") or current_user.get("id"),
        action=log.action,
        module=log.module,
        entity_id=log.entity_id,
        details=log.details
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log
