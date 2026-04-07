from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class BudgetRevisionBase(BaseModel):
    project_id: str
    project_name: str
    pm_name: str
    previous_budget: float
    revised_budget: float
    reasons: str
    status: str = "Pending Head"
    finance_note: Optional[str] = None
    waiting_until: Optional[datetime] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None

class BudgetRevisionCreate(BudgetRevisionBase):
    pass

class BudgetRevisionUpdate(BaseModel):
    status: Optional[str] = None
    finance_note: Optional[str] = None
    waiting_until: Optional[datetime] = None

class BudgetRevisionResponse(BudgetRevisionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
