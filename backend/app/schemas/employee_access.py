from pydantic import BaseModel
from typing import List, Optional
from .employee import EmployeeOut

class EmployeeAccessBase(BaseModel):
    employee_id: int
    access_level: str
    status: str
    modules: List[str]

class EmployeeAccessCreate(EmployeeAccessBase):
    password: str

class EmployeeAccessUpdate(EmployeeAccessBase):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class EmployeeAccessOut(EmployeeAccessBase):
    id: int
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    employee_code: Optional[str] = None
    employee: Optional[EmployeeOut] = None

    class Config:
        from_attributes = True
