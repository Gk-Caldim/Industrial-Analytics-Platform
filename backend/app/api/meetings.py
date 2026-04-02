from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import uuid
import os
import logging

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.meeting import Meeting
from app.services.meeting_creators import GoogleMeetCreator, MicrosoftTeamsCreator, ZohoMeetCreator
from app.services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter()

class ScheduleRequest(BaseModel):
    title: Optional[str] = "Meeting"
    description: Optional[str] = None
    date: str
    time: str
    platform: str
    duration_minutes: Optional[int] = 60
    attendees: Optional[List[str]] = []
    timezone: Optional[str] = "UTC"
    organizer_email: Optional[str] = "unknown@example.com"

@router.get("/")
async def list_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).all()
    results = []
    for m in meetings:
        results.append({
            "id": m.id,
            "title": m.title,
            "date": m.date,
            "time": m.time,
            "platform": m.platform,
            "join_url": m.join_url,
            "joinUrl": m.join_url,
            "meeting_code": m.meeting_code,
            "meetingCode": m.meeting_code,
            "status": m.status,
            "duration": m.duration_minutes
        })
    return {"success": True, "meetings": results}

@router.get("/availability")
async def get_availability(date: str, attendees: str = ""):
    all_slots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM']
    return {"success": True, "availableSlots": all_slots}

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    import ast
    attendees_list = []
    try:
        attendees_list = ast.literal_eval(meeting.attendees) if meeting.attendees else []
    except:
        attendees_list = [meeting.attendees] if meeting.attendees else []

    return {
        "success": True,
        "meeting": {
            "id": meeting.id,
            "title": meeting.title,
            "description": meeting.description,
            "date": meeting.date,
            "time": meeting.time,
            "duration": meeting.duration_minutes,
            "platform": meeting.platform,
            "join_url": meeting.join_url,
            "joinUrl": meeting.join_url,
            "meeting_code": meeting.meeting_code,
            "meetingCode": meeting.meeting_code,
            "attendees": attendees_list,
            "status": meeting.status
        }
    }

def send_invites_background(meeting_data: dict, join_url: str):
    try:
        email_service.send_meeting_invite(meeting_data, join_url)
    except Exception as e:
        logger.error(f"Background invite task failed: {e}")

@router.post("/publish")
async def publish_meeting(req: ScheduleRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    meeting_data = {
        'title': req.title,
        'description': req.description or '',
        'date': req.date,
        'time': req.time,
        'duration_minutes': req.duration_minutes,
        'platform': req.platform,
        'attendees': req.attendees or [],
        'timezone_name': req.timezone
    }
    
    platform = req.platform.lower()
    join_url = None
    meeting_code = None
    
    try:
        if platform in ['google', 'gmeet', 'meet']:
            google_token = os.environ.get('GOOGLE_OAUTH_TOKEN')
            refresh_token = os.environ.get('GOOGLE_REFRESH_TOKEN')
            client_id = os.environ.get('GOOGLE_CLIENT_ID')
            client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')

            if not google_token:
                raise HTTPException(status_code=400, detail="Google Meet (GOOGLE_OAUTH_TOKEN) not configured.")
            
            creator = GoogleMeetCreator(
                google_token, 
                refresh_token=refresh_token, 
                client_id=client_id, 
                client_secret=client_secret
            )
            result = creator.create_meeting(meeting_data)
            join_url = result.get('join_url')
            meeting_code = result.get('meeting_code')
            
        elif platform == 'teams':
            teams_token = get_teams_token()
            creator = MicrosoftTeamsCreator(teams_token)
            result = creator.create_meeting(meeting_data)
            join_url = result.get('join_url')
            meeting_code = result.get('meeting_code')
            
        elif platform == 'zoho':
            zoho_token = os.environ.get('ZOHO_REFRESH_TOKEN')
            zoho_org = os.environ.get('ZOHO_ORG_ID')
            if not zoho_token or not zoho_org:
                 raise HTTPException(status_code=400, detail="Zoho Mail not configured.")
            creator = ZohoMeetCreator(zoho_token, zoho_org)
            result = creator.create_meeting(meeting_data)
            join_url = result.get('join_url')
            meeting_code = result.get('meeting_code')
            
        else:
             raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
             
    except Exception as e:
        logger.error(f"Failed to create meeting on platform {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    meeting = Meeting(
        title=req.title,
        description=req.description,
        date=req.date,
        time=req.time,
        duration_minutes=req.duration_minutes,
        platform=platform,
        join_url=join_url,
        meeting_code=meeting_code,
        organizer_email=req.organizer_email,
        attendees=str(req.attendees),
        status='scheduled',
        invites_sent=True  # Triggered in Background
    )
    
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    background_tasks.add_task(send_invites_background, meeting_data, join_url)
    
    return {
        'success': True,
        'meeting': {
            'id': meeting.id,
            'title': meeting.title,
            'platform': platform,
            'duration': meeting.duration_minutes,
            'join_url': join_url,
            'joinUrl': join_url,
            'meeting_code': meeting_code,
            'meetingCode': meeting_code,
            'attendees': req.attendees,
            'invites_sent': meeting.invites_sent
        }
    }

def get_teams_token():
    import requests
    tenant = os.environ.get('AZURE_TENANT_ID')
    if not tenant:
        raise Exception("Azure Tenant ID not set")
        
    token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    data = {
        'client_id': os.environ.get('AZURE_CLIENT_ID'),
        'client_secret': os.environ.get('AZURE_CLIENT_SECRET'),
        'scope': 'https://graph.microsoft.com/.default',
        'grant_type': 'client_credentials'
    }
    response = requests.post(token_url, data=data)
    if response.status_code != 200:
        raise Exception('Failed to get Teams token')
    return response.json()['access_token']
