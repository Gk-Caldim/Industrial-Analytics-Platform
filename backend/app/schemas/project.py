from pydantic import BaseModel
from typing import Any, Dict, Optional

class ProjectBase(BaseModel):
    project_id: Optional[str] = None
    name: str
    manager: str
    status: str = "Planning"
    budget: float = 0.0
    timeline: str | None = None
    teamSize: int = 0
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    custom_fields: Dict[str, Any] = {}

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int

    class Config:
        orm_mode = True
