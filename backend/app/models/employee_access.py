from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base

class EmployeeAccess(Base):
    __tablename__ = "employee_access"

    __table_args__ = (
        UniqueConstraint("employee_id", name="uq_employee_access_employee"),
    )

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False
    )

    access_level = Column(String, nullable=False)
    status = Column(String, nullable=False)
    modules = Column(ARRAY(String))
    hashed_password = Column(String, nullable=True)

    # De-normalized fields for easier access and history
    employee_name = Column(String, nullable=True)
    employee_email = Column(String, nullable=True)
    employee_code = Column(String, nullable=True)  # e.g. "CDE100"

    employee = relationship("Employee")
