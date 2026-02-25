from sqlalchemy.orm import Session
from app.models.part_column import PartColumn
from app.schemas.part_column import PartColumnCreate, PartColumnUpdate
from typing import List, Optional

def get_columns(db: Session) -> List[PartColumn]:
    """Get all custom column definitions"""
    return db.query(PartColumn).order_by(PartColumn.id).all()

def get_column(db: Session, column_id: int) -> Optional[PartColumn]:
    """Get a single column by ID"""
    return db.query(PartColumn).filter(PartColumn.id == column_id).first()

def get_column_by_name(db: Session, column_name: str) -> Optional[PartColumn]:
    """Get column by name"""
    return db.query(PartColumn).filter(PartColumn.column_name == column_name).first()

def create_column(db: Session, column: PartColumnCreate) -> PartColumn:
    """Create a new custom column"""
    db_column = PartColumn(**column.model_dump())
    db.add(db_column)
    db.commit()
    db.refresh(db_column)
    return db_column

def update_column(db: Session, column_id: int, column: PartColumnUpdate) -> Optional[PartColumn]:
    """Update a custom column"""
    db_column = get_column(db, column_id)
    if not db_column:
        return None
    
    update_data = column.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_column, field, value)
    
    db.commit()
    db.refresh(db_column)
    return db_column

def delete_column(db: Session, column_id: int) -> bool:
    """Delete a custom column"""
    db_column = get_column(db, column_id)
    if not db_column:
        return False
    
    db.delete(db_column)
    db.commit()
    return True
