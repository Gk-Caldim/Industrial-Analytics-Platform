from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.settings import SystemSetting as SystemSettingModel
from app.schemas.settings import SystemSetting as SystemSettingSchema, SystemSettingBase, BulkSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/", response_model=List[SystemSettingSchema])
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettingModel).all()
    
    # Initial setup if no settings exist
    if not settings:
        default_settings = [
            {"category": "Organization", "key": "company_name", "value": "Industrial Analytics Platform", "type": "text"},
            {"category": "Organization", "key": "company_logo", "value": "", "type": "image"},
            {"category": "Organization", "key": "hq_address", "value": "123 Tech City, Industrial Park", "type": "text"},
            {"category": "Branding", "key": "primary_color", "value": "#6366f1", "type": "color"},
            {"category": "Branding", "key": "secondary_color", "value": "#0ea5e9", "type": "color"},
            {"category": "Branding", "key": "display_mode", "value": "light", "type": "select"},
            {"category": "System", "key": "auto_backup", "value": "true", "type": "toggle"},
            {"category": "System", "key": "notifications_enabled", "value": "true", "type": "toggle"}
        ]
        for ds in default_settings:
            db_setting = SystemSettingModel(**ds)
            db.add(db_setting)
        db.commit()
        settings = db.query(SystemSettingModel).all()
        
    return settings

@router.patch("/bulk", response_model=List[SystemSettingSchema])
def update_bulk_settings(update_data: BulkSettingsUpdate, db: Session = Depends(get_db)):
    for setting in update_data.settings:
        db_setting = db.query(SystemSettingModel).filter(SystemSettingModel.key == setting.key).first()
        if db_setting:
            db_setting.value = setting.value
        else:
            # Create if doesn't exist
            db_setting = SystemSettingModel(**setting.dict())
            db.add(db_setting)
    
    db.commit()
    return db.query(SystemSettingModel).all()
