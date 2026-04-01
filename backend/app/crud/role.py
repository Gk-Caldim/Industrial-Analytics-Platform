# app/crud/role.py
from sqlalchemy.orm import Session
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate

def get_role(db: Session, role_id: int):
    return db.query(Role).filter(Role.id == role_id).first()

def get_role_by_name(db: Session, name: str):
    return db.query(Role).filter(Role.name == name).first()

def get_roles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Role).offset(skip).limit(limit).all()

def create_role(db: Session, role: RoleCreate):
    db_role = Role(
        name=role.name,
        description=role.description,
        permissions=role.permissions
    )
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def update_role(db: Session, role_id: int, role: RoleUpdate):
    db_role = get_role(db, role_id)
    if not db_role:
        return None
    
    update_data = role.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_role, key, value)
    
    db.commit()
    db.refresh(db_role)
    return db_role

def delete_role(db: Session, role_id: int):
    db_role = get_role(db, role_id)
    if not db_role:
        return None
    db.delete(db_role)
    db.commit()
    return db_role

def seed_default_roles(db: Session):
    default_roles = [
        {"name": "Super Admin", "description": "Full system access.", "permissions": ["Dashboard", "MOM", "Employee Master", "Project Master", "Department Master", "Upload Trackers", "Budget Upload", "Settings"]},
        {"name": "Admin", "description": "Administrative access excluding settings.", "permissions": ["Dashboard", "MOM", "Employee Master", "Project Master", "Department Master", "Upload Trackers", "Budget Upload"]},
        {"name": "Manager", "description": "Operational and management access.", "permissions": ["Dashboard", "MOM", "Project Master", "Department Master", "Upload Trackers"]},
        {"name": "Employee", "description": "Standard user access.", "permissions": ["Dashboard", "MOM"]},
        {"name": "Intern", "description": "Restricted dashboard-only access.", "permissions": ["Dashboard"]}
    ]
    
    for r in default_roles:
        if not get_role_by_name(db, r["name"]):
            create_role(db, RoleCreate(**r))
