from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, backref
from app.core.database import Base

class Part(Base):
    __tablename__ = "parts"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    stock = Column(Integer, default=0)
    reorder_level = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    
    # Custom columns support
    custom_attributes = Column(JSONB, default={})
    
    # Relations (Example: Parent Part for sub-assemblies)
    parent_part_id = Column(String, ForeignKey("parts.id"), nullable=True)
    children = relationship("Part", backref=backref("parent", remote_side=[id]))

    # You can add more relations here, e.g., to suppliers, projects, etc.
