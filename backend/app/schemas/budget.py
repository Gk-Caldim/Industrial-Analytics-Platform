from pydantic import BaseModel
from typing import List, Any, Optional
from datetime import datetime

class BudgetSummaryBase(BaseModel):
    project_name: str
    currency: str = "$"
    budget_data: List[List[Any]] = []

class BudgetSummaryCreate(BudgetSummaryBase):
    pass

class BudgetSummaryResponse(BudgetSummaryBase):
    id: int

    class Config:
        from_attributes = True
