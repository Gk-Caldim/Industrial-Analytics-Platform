from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.department import Department
from app.models.employee import Employee
from app.schemas.department import DepartmentCreate, DepartmentUpdate

def get_departments(db: Session, skip: int = 0, limit: int = 100):
    departments = db.query(Department).offset(skip).limit(limit).all()
    for dept in departments:
        # Autocalculate employee count by department name
        count = db.query(Employee).filter(Employee.department == dept.name).count()
        dept.employees = count
    return departments

def get_department(db: Session, department_id: int):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if dept:
        count = db.query(Employee).filter(Employee.department == dept.name).count()
        dept.employees = count
    return dept

def create_department(db: Session, dept: DepartmentCreate):
    # Calculate balance budget
    alloc = dept.budget_allocation or 0.0
    util = dept.utilized_budget or 0.0
    balance = alloc - util

    db_dept = Department(
        name=dept.name,
        head=dept.head,
        project_name=dept.project_name,
        location=dept.location,
        employees=0, # Will be calculated on fetching
        budget_allocation=alloc,
        utilized_budget=util,
        balance_budget=balance,
        status="Active",
        custom_attributes=dept.custom_attributes
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def update_department(db: Session, department_id: int, dept_update: DepartmentUpdate):
    db_dept = db.query(Department).filter(Department.id == department_id).first()
    if not db_dept:
        return None
    
    update_data = dept_update.dict(exclude_unset=True)
    
    if 'custom_attributes' in update_data:
        # Shallow merge of custom attributes
        existing_attrs = dict(db_dept.custom_attributes or {})
        existing_attrs.update(update_data['custom_attributes'])
        update_data['custom_attributes'] = existing_attrs

    for key, value in update_data.items():
        setattr(db_dept, key, value)
    
    # Recalculate balance if budget-related fields updated
    if 'budget_allocation' in update_data or 'utilized_budget' in update_data:
        alloc = db_dept.budget_allocation or 0.0
        util = db_dept.utilized_budget or 0.0
        db_dept.balance_budget = alloc - util
        
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def delete_department(db: Session, department_id: int):
    db_dept = db.query(Department).filter(Department.id == department_id).first()
    if db_dept:
        db.delete(db_dept)
        db.commit()
    return db_dept
