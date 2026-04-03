from pydantic import BaseModel
from typing import Dict, Any, Optional

class DepartmentBase(BaseModel):
    department_id: Optional[str] = None
    name: str
    head: Optional[str] = None
    employees: int = 0
    project_name: str | None = None
    status: str = "Active"
    location: str | None = None
    budget_allocation: float = 0.0
    utilized_budget: float = 0.0
    balance_budget: float = 0.0
    custom_attributes: Dict[str, Any] = {}

class DepartmentCreate(BaseModel):
    department_id: Optional[str] = None
    name: str
    head: Optional[str] = None
    project_name: str | None = None
    location: str | None = None
    budget_allocation: float = 0.0
    utilized_budget: float = 0.0
    balance_budget: float = 0.0
    custom_attributes: Dict[str, Any] = {}

class DepartmentUpdate(BaseModel):
    department_id: Optional[str] = None
    name: str | None = None
    head: str | None = None
    project_name: str | None = None
    location: str | None = None
    budget_allocation: float | None = None
    utilized_budget: float | None = None
    balance_budget: float | None = None
    status: str | None = None
    custom_attributes: Dict[str, Any] | None = None

class DepartmentResponse(DepartmentBase):
    id: int

    model_config = {"from_attributes": True}
