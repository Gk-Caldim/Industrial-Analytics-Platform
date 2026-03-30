from pydantic import BaseModel
from typing import Dict, Any, Optional

class DepartmentBase(BaseModel):
    department_id: Optional[str] = None
    name: str
    head: str
    employees: int = 0
    budget: float = 0.0
    status: str = "Active"
    location: str | None = None
    email: str | None = None
    custom_attributes: Dict[str, Any] = {}

class DepartmentCreate(BaseModel):
    department_id: Optional[str] = None
    name: str
    head: str
    budget: float = 0.0
    location: str | None = None
    email: str | None = None
    custom_attributes: Dict[str, Any] = {}

class DepartmentUpdate(BaseModel):
    department_id: Optional[str] = None
    name: str | None = None
    head: str | None = None
    budget: float | None = None
    location: str | None = None
    status: str | None = None
    email: str | None = None
    custom_attributes: Dict[str, Any] | None = None

class DepartmentResponse(DepartmentBase):
    id: int

    class Config:
        orm_mode = True
