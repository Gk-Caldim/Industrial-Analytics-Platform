from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    head = Column(String, nullable=False)
    employees = Column(Integer, default=0)
    budget = Column(Float, default=0.0)
    status = Column(String, default="Active")
    location = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # Custom columns support
    custom_attributes = Column(JSONB, default={})
