from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.employee_access import EmployeeAccess  # SQLAlchemy model
from app.schemas.employee_access import EmployeeAccessCreate, EmployeeAccessUpdate, EmployeeAccessOut  # Pydantic
from app.models.user import User
from app.models.employee import Employee
from app.core.security import hash_password

router = APIRouter(prefix="/employee-access", tags=["Employee Access"])

@router.get("/", response_model=List[EmployeeAccessOut])
def get_access_rules(db: Session = Depends(get_db)):
    return db.query(EmployeeAccess).all()

@router.post("/")
def create_access(rule: EmployeeAccessCreate, db: Session = Depends(get_db)):
    # Check unique constraint: one rule per employee
    existing = db.query(EmployeeAccess).filter(EmployeeAccess.employee_id == rule.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Access rule for this employee already exists")

    # Fetch employee to get details
    employee = db.query(Employee).filter(Employee.id == rule.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    hashed_pwd = None
    if rule.password:
        hashed_pwd = hash_password(rule.password)

    new_rule = EmployeeAccess(
        employee_id=rule.employee_id,
        access_level=rule.access_level,
        modules=rule.modules,
        status=rule.status,
        hashed_password=hashed_pwd,
        # Populate de-normalized fields
        employee_name=employee.name,
        employee_email=employee.email,
        employee_code=employee.employee_id
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@router.put("/{rule_id}")
def update_access(rule_id: int, rule: EmployeeAccessUpdate, db: Session = Depends(get_db)):
    access_rule = db.query(EmployeeAccess).filter(EmployeeAccess.id == rule_id).first()
    if not access_rule:
        raise HTTPException(status_code=404, detail="Access rule not found")
    
    # Unique constraint check for employee_id if it changed
    if rule.employee_id != access_rule.employee_id:
        if db.query(EmployeeAccess).filter(EmployeeAccess.employee_id == rule.employee_id, EmployeeAccess.id != rule_id).first():
            raise HTTPException(status_code=400, detail="Another rule for this employee already exists")

    access_rule.employee_id = rule.employee_id
    access_rule.access_level = rule.access_level
    access_rule.modules = rule.modules
    access_rule.status = rule.status

    # Update password if provided
    if rule.password:
        access_rule.hashed_password = hash_password(rule.password)

    # Update de-normalized fields and sync with Employee table
    if access_rule.employee:
        # If name is updated
        if rule.name:
            access_rule.employee_name = rule.name
            access_rule.employee.name = rule.name
        elif not access_rule.employee_name:
             # Backfill if missing
             access_rule.employee_name = access_rule.employee.name
        
        # If email is updated
        if rule.email:
            # Check for uniqueness in Employee table if changed
            if rule.email != access_rule.employee.email:
                from app.models.employee import Employee
                existing_email = db.query(Employee).filter(Employee.email == rule.email, Employee.id != access_rule.employee_id).first()
                if existing_email:
                    raise HTTPException(status_code=400, detail="Email already in use by another employee")
                access_rule.employee.email = rule.email
            
            access_rule.employee_email = rule.email
        elif not access_rule.employee_email:
             # Backfill
             access_rule.employee_email = access_rule.employee.email

        # Ensure code is populated
        if not access_rule.employee_code:
            access_rule.employee_code = access_rule.employee.employee_id
            
        # Also sync role
        access_rule.employee.role = rule.access_level

    db.commit()
    db.refresh(access_rule)
    return access_rule

@router.delete("/{rule_id}")
def delete_access(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(EmployeeAccess).filter(EmployeeAccess.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Access rule not found")
    db.delete(rule)
    db.commit()
    return {"success": True}
