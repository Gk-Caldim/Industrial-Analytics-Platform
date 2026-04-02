# app/crud/employee.py
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.core.security import hash_password
from typing import List, Optional

def get_employees(db: Session, skip: int = 0, limit: int = 1000) -> List[Employee]:
    """Get all employees"""
    return db.query(Employee).offset(skip).limit(limit).all()

def get_employee(db: Session, employee_id: int) -> Optional[Employee]:
    """Get a single employee by ID"""
    return db.query(Employee).filter(Employee.id == employee_id).first()

def get_employee_by_email(db: Session, email: str) -> Optional[Employee]:
    """Get employee by email"""
    return db.query(Employee).filter(Employee.email == email).first()

def get_employee_by_employee_id(db: Session, employee_id: str) -> Optional[Employee]:
    """Get employee by custom employee_id"""
    return db.query(Employee).filter(Employee.employee_id == employee_id).first()

def create_employee(db: Session, employee: EmployeeCreate) -> Employee:
    """Create a new employee"""
    # Check if employee_id already exists
    if employee.employee_id:
        existing = get_employee_by_employee_id(db, employee.employee_id)
        if existing:
            raise ValueError(f"Employee with ID {employee.employee_id} already exists")
            
    data = employee.model_dump(exclude={"id"})
    password = data.pop("password", None)
    if password:
        data["hashed_password"] = hash_password(password)
        
    db_employee = Employee(**data)
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: int, employee: EmployeeUpdate) -> Optional[Employee]:
    """Update an existing employee"""
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    
    update_data = employee.model_dump(exclude_unset=True)
    
    # Check if ID is being updated and verify it doesn't exist
    if 'id' in update_data and update_data['id'] != employee_id:
        existing_id = get_employee(db, update_data['id'])
        if existing_id:
            raise ValueError(f"Employee with id {update_data['id']} already exists")

    # Check if employee_id is being updated and verify it doesn't exist
    if 'employee_id' in update_data and update_data['employee_id'] != db_employee.employee_id:
        if update_data['employee_id']:  # Only check if not None
            existing = get_employee_by_employee_id(db, update_data['employee_id'])
            if existing and existing.id != employee_id:
                raise ValueError(f"Employee with ID {update_data['employee_id']} already exists")
    
    # Handle password update
    password = update_data.pop("password", None)
    if password:
        update_data["hashed_password"] = hash_password(password)
            
    for field, value in update_data.items():
        setattr(db_employee, field, value)
    
    db.commit()
    db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: int) -> bool:
    """Delete an employee"""
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return False
    
    db.delete(db_employee)
    db.commit()
    return True

def bulk_delete_employees(db: Session, employee_ids: List[int]) -> bool:
    """Bulk delete employees"""
    try:
        db.query(Employee).filter(Employee.id.in_(employee_ids)).delete(synchronize_session=False)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
