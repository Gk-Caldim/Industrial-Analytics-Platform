from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.budget import BudgetSummary
from app.schemas.budget import BudgetSummaryCreate, BudgetSummaryResponse

router = APIRouter()

@router.get("/{project_name}", response_model=BudgetSummaryResponse)
def get_budget_summary(project_name: str, db: Session = Depends(get_db)):
    budget = db.query(BudgetSummary).filter(BudgetSummary.project_name == project_name).first()
    if not budget:
        return BudgetSummaryResponse(id=0, project_name=project_name, currency="$", budget_data=[])
    return budget

@router.post("/{project_name}", response_model=BudgetSummaryResponse)
def save_budget_summary(project_name: str, budget_data: BudgetSummaryCreate, db: Session = Depends(get_db)):
    budget = db.query(BudgetSummary).filter(BudgetSummary.project_name == project_name).first()
    if budget:
        budget.budget_data = budget_data.budget_data
        budget.currency = budget_data.currency
        db.commit()
        db.refresh(budget)
    else:
        budget = BudgetSummary(project_name=project_name, currency=budget_data.currency, budget_data=budget_data.budget_data)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget
