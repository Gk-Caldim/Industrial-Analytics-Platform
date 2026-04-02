# app/api/roles.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud.role import get_role, get_role_by_name, get_roles, create_role, update_role, delete_role, seed_default_roles
from app.schemas.role import Role, RoleCreate, RoleUpdate

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=List[Role])
def read_roles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    roles = get_roles(db, skip=skip, limit=limit)
    if not roles:
        seed_default_roles(db)
        roles = get_roles(db, skip=skip, limit=limit)
    return roles

@router.post("/", response_model=Role)
def create_new_role(role: RoleCreate, db: Session = Depends(get_db)):
    db_role = get_role_by_name(db, name=role.name)
    if db_role:
        raise HTTPException(status_code=400, detail="Role already exists")
    return create_role(db=db, role=role)

@router.get("/{role_id}", response_model=Role)
def read_role(role_id: int, db: Session = Depends(get_db)):
    db_role = get_role(db, role_id=role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return db_role

@router.patch("/{role_id}", response_model=Role)
def update_existing_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db)):
    db_role = update_role(db, role_id=role_id, role=role)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return db_role

@router.delete("/{role_id}", response_model=Role)
def delete_existing_role(role_id: int, db: Session = Depends(get_db)):
    db_role = delete_role(db, role_id=role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return db_role
