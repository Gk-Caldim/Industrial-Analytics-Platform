from sqlalchemy import Column, Integer, String, Float, DateTime, Text, LargeBinary
from sqlalchemy.sql import func
from app.core.database import Base

class BudgetRevision(Base):
    __tablename__ = "budget_revisions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, nullable=False)
    project_name = Column(String, index=True, nullable=False)
    pm_name = Column(String, nullable=False)
    previous_budget = Column(Float, nullable=False)
    revised_budget = Column(Float, nullable=False)
    reasons = Column(Text, nullable=False)
    
    # Attachment stored in DB
    attachment_data = Column(LargeBinary, nullable=True)
    attachment_name = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True)
    
    # Status: Pending Head, Pending Finance, Approved, Declined, Cancelled, In Waiting Period
    status = Column(String, default="Pending Head")
    
    finance_note = Column(Text, nullable=True)
    waiting_until = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
