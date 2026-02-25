from pydantic import BaseModel
from typing import Any, Dict, Optional

class ProjectBase(BaseModel):
    name: str
    manager: str
    status: str = "Planning"
    budget: float = 0.0
    timeline: str | None = None
    teamSize: int = 0
    custom_fields: Dict[str, Any] = {}

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int

    class Config:
        orm_mode = True
