from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean
from datetime import datetime, timezone
import uuid

from app.core.database import Base

class Meeting(Base):
    __tablename__ = 'meetings'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True, index=True) # Optional now that we're centralizing
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Date & Time
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    time = Column(String(10), nullable=False)   # HH:MM
    duration_minutes = Column(Integer, default=60)
    timezone_name = Column(String(50), default='UTC')
    
    # Platform & Credentials
    platform = Column(String(20), nullable=False)  # 'gmeet', 'teams', 'zoho'
    meeting_id = Column(String(100), nullable=True)  # Legacy local reference
    meeting_code = Column(String(100), nullable=True) # Real platform ID
    meeting_password = Column(String(100), nullable=True)
    join_url = Column(String(500), nullable=True)
    google_calendar_event_id = Column(String(100), nullable=True)
    
    # Attendees
    organizer_email = Column(String, nullable=True)
    attendees = Column(Text, nullable=True)  # JSON list of emails as string
    
    # Status
    status = Column(String(20), default='scheduled')  # scheduled, completed, cancelled
    invites_sent = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
