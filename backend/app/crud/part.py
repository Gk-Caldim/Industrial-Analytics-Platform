from sqlalchemy.orm import Session
from app.models.part import Part
from app.schemas.part import PartCreate, PartUpdate

def get_parts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Part).offset(skip).limit(limit).all()

def get_part(db: Session, part_id: str):
    return db.query(Part).filter(Part.id == part_id).first()

def create_part(db: Session, part: PartCreate):
    db_part = Part(**part.dict())
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part

def update_part(db: Session, part_id: str, part_update: PartUpdate):
    db_part = get_part(db, part_id)
    if not db_part:
        return None
    
    update_data = part_update.dict(exclude_unset=True)
    
    if 'custom_attributes' in update_data:
        # Shallow merge of custom attributes
        existing_attrs = dict(db_part.custom_attributes or {})
        existing_attrs.update(update_data['custom_attributes'])
        update_data['custom_attributes'] = existing_attrs

    for key, value in update_data.items():
        setattr(db_part, key, value)
        
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part

def delete_part(db: Session, part_id: str):
    db_part = get_part(db, part_id)
    if db_part:
        db.delete(db_part)
        db.commit()
    return db_part
