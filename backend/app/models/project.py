from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    manager = Column(String, nullable=False)
    status = Column(String, default="Planning")
    budget = Column(Float, default=0.0)
    timeline = Column(String, nullable=True)
    teamSize = Column(Integer, default=0)
    custom_fields = Column(JSONB, default={})
