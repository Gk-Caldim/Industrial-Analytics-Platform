from pydantic import BaseModel
from typing import Optional, List

class SystemSettingBase(BaseModel):
    category: str
    key: str
    value: str
    type: str

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value: str

class SystemSetting(SystemSettingBase):
    id: int

    class Config:
        from_attributes = True

class BulkSettingsUpdate(BaseModel):
    settings: List[SystemSettingBase]
