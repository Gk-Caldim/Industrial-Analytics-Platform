from pydantic import BaseModel
from typing import List, Any, Optional
from datetime import datetime

class BudgetSummaryBase(BaseModel):
    project_name: str
    uploaded_by: Optional[str] = None
    department: Optional[str] = None
    overall_budget: float = 0.0
    budget_data: List[Any] = []

class BudgetSummaryCreate(BudgetSummaryBase):
    pass

class BudgetSummaryResponse(BudgetSummaryBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
