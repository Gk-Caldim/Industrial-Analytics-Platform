from sqlalchemy.orm import Session
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate

def get_departments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Department).offset(skip).limit(limit).all()

def get_department(db: Session, department_id: int):
    return db.query(Department).filter(Department.id == department_id).first()

def create_department(db: Session, dept: DepartmentCreate):
    db_dept = Department(
        name=dept.name,
        head=dept.head,
        project_name=dept.project_name,
        location=dept.location,
        employees=0,
        status="Active",
        custom_attributes=dept.custom_attributes
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def update_department(db: Session, department_id: int, dept_update: DepartmentUpdate):
    db_dept = get_department(db, department_id)
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
        
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def delete_department(db: Session, department_id: int):
    db_dept = get_department(db, department_id)
    if db_dept:
        db.delete(db_dept)
        db.commit()
    return db_dept
