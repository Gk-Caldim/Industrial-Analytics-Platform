from sqlalchemy import Column, Integer, String, DateTime, LargeBinary
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class BudgetSummary(Base):
    __tablename__ = "budget_summaries"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, unique=True, index=True, nullable=False)
    uploaded_by = Column(String)
    department = Column(String)
    budget_data = Column(JSONB, default=[])
    attachment_data = Column(LargeBinary, nullable=True)
    attachment_name = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

