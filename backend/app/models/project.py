from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    manager = Column(JSONB, nullable=False, default=[])
    team_lead = Column(JSONB, nullable=True, default=[])
    status = Column(String, default="Planning")
    budget = Column(Float, default=0.0)
    utilized_budget = Column(Float, default=0.0)
    balance_budget = Column(Float, default=0.0)
    timeline = Column(String, nullable=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True)
    employee_name = Column(String, nullable=True)
    custom_fields = Column(JSONB, default={})

    # Relationship to Employee model
    employee = relationship("Employee", foreign_keys=[employee_id], primaryjoin="Project.employee_id == Employee.employee_id")
