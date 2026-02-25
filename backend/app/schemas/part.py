from pydantic import BaseModel, root_validator
from typing import Any, Dict, Optional

class PartBase(BaseModel):
    name: str
    category: str | None = None
    stock: int = 0
    reorder_level: int = 0
    price: float = 0.0
    parent_part_id: str | None = None
    custom_attributes: Dict[str, Any] = {}

class PartCreate(PartBase):
    id: str

    class Config:
        extra = "allow"

    @root_validator(pre=True)
    def pack_custom_attributes(cls, values):
        # known_fields should include all fields defined in PartBase and PartCreate
        known_fields = {'id', 'name', 'category', 'stock', 'reorder_level', 'price', 'parent_part_id', 'custom_attributes'}
        
        # Sanitize numeric fields (handle empty strings or None from frontend forms)
        if 'stock' in values and (values['stock'] == "" or values['stock'] is None):
            values['stock'] = 0
        if 'reorder_level' in values and (values['reorder_level'] == "" or values['reorder_level'] is None):
            values['reorder_level'] = 0
        if 'price' in values and (values['price'] == "" or values['price'] is None):
            values['price'] = 0.0
            
        # Sanitize optional string fields (handle empty strings as None if preferred, or keep as is)
        # Note: Pydantic allows empty strings for Optional[str], so "" is valid for category/parent_part_id.
        # But if we want to store NULL in DB for empty strings:
        if 'category' in values and values['category'] == "":
            values['category'] = None
        if 'parent_part_id' in values and values['parent_part_id'] == "":
            values['parent_part_id'] = None

        custom_attrs = values.get('custom_attributes', {}) or {}
        if not isinstance(custom_attrs, dict):
            custom_attrs = {}
            
        # Move unknown fields to custom_attributes
        new_values = {}
        for k, v in values.items():
            if k in known_fields:
                new_values[k] = v
            else:
                custom_attrs[k] = v
        
        new_values['custom_attributes'] = custom_attrs
        return new_values

class PartUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    stock: int | None = None
    reorder_level: int | None = None
    price: float | None = None
    parent_part_id: str | None = None
    custom_attributes: Dict[str, Any] | None = None

    class Config:
        extra = "allow"

    @root_validator(pre=True)
    def pack_custom_attributes(cls, values):
        known_fields = {'name', 'category', 'stock', 'reorder_level', 'price', 'parent_part_id', 'custom_attributes'}
        
        # Sanitize numeric fields
        if 'stock' in values and values['stock'] == "":
            values['stock'] = None # Allow None for update
        if 'reorder_level' in values and values['reorder_level'] == "":
            values['reorder_level'] = None
        if 'price' in values and values['price'] == "":
            values['price'] = None
            
        # Sanitize optional string fields
        if 'category' in values and values['category'] == "":
            values['category'] = None
        if 'parent_part_id' in values and values['parent_part_id'] == "":
            values['parent_part_id'] = None

        custom_attrs = values.get('custom_attributes', {}) or {}
        if not isinstance(custom_attrs, dict):
            custom_attrs = {}
            
        new_values = {}
        for k, v in values.items():
            if k in known_fields:
                new_values[k] = v
            else:
                custom_attrs[k] = v
        
        # Only set custom_attributes if we actually found some or if it was explicitly passed
        if custom_attrs:
            new_values['custom_attributes'] = custom_attrs
            
        return new_values

class PartResponse(PartBase):
    id: str

    class Config:
        orm_mode = True

