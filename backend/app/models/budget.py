from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class BudgetSummary(Base):
    __tablename__ = "budget_summaries"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, unique=True, index=True, nullable=False)
    currency = Column(String, default="$")
    budget_data = Column(JSONB, default=[])

