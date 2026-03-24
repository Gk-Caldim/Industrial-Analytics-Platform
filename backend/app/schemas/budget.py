from pydantic import BaseModel
from typing import List, Any

class BudgetSummaryBase(BaseModel):
    project_name: str
    budget_data: List[List[Any]] = []

class BudgetSummaryCreate(BudgetSummaryBase):
    pass

class BudgetSummaryResponse(BudgetSummaryBase):
    id: int

    class Config:
        orm_mode = True
