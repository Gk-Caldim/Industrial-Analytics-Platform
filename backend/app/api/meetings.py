from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid
import random
import os
import smtplib
from email.message import EmailMessage
import logging
from datetime import datetime, timedelta, timezone
import requests
import json

from app.core.security import get_current_user

try:
    from google_auth_oauthlib.flow import Flow
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from google.auth.transport.requests import Request as GoogleRequest
except ImportError:
    pass

try:
    import msal
except ImportError:
    pass

logger = logging.getLogger(__name__)

# --- Email Service ---
def send_meeting_email_sync(action: str, meeting: dict):
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD")

    if not smtp_user or not smtp_pass:
        logger.warning("SMTP credentials not configured. Skipping actual email dispatch.")
        # Fallback to mock logging for demonstration if no creds
        print(f"\n[MOCK EMAIL] '{action.upper()}' email to {meeting.get('attendees')} for {meeting.get('title')}\n")
        return

    attendees = meeting.get("attendees", [])
    if not attendees:
        return

    msg = EmailMessage()
    
    subject_prefix = ""
    if action == "update":
        subject_prefix = "Updated: "
    elif action == "cancellation":
        subject_prefix = "Cancelled: "
        
    msg['Subject'] = f"{subject_prefix}{meeting.get('title', 'Meeting')}"
    msg['From'] = smtp_user
    msg['To'] = ", ".join(attendees)

    body = f"""
Meeting: {meeting.get('title')}
Status: {action.upper()}
Date: {meeting.get('date')}
Time: {meeting.get('time')}
Duration: {meeting.get('duration')} mins
Platform: {meeting.get('platform')}

Join URL: {meeting.get('joinUrl', 'No URL')}
Meeting ID: {meeting.get('id')}
Passcode: {meeting.get('passcode', 'N/A')}

Agenda:
{chr(10).join(f"- {a}" for a in meeting.get('agenda', []))}

Description:
{meeting.get('description', '')}
    """
    msg.set_content(body)

    # Attach ICS (Basic Mock structure)
    dt_creation = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:{dt_creation}
SUMMARY:{msg['Subject']}
DESCRIPTION:{meeting.get('description', '')}
LOCATION:{meeting.get('joinUrl', '')}
STATUS:{"CANCELLED" if action == "cancellation" else "CONFIRMED"}
END:VEVENT
END:VCALENDAR"""
    
    msg.add_attachment(ics_content.encode('utf-8'), maintype='text', subtype='calendar', filename='invite.ics')

    # Retry logic (up to 3 times)
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            logger.info(f"Email '{action}' sent successfully to {len(attendees)} attendees.")
            break
        except Exception as e:
            logger.error(f"Failed to send email on attempt {attempt}: {e}")
            if attempt == max_retries:
                logger.error("Max email retries reached. Delivery failed.")

router = APIRouter()

# In-memory databases
meetings_db: Dict[str, dict] = {}
user_tokens_db: Dict[str, Dict[str, dict]] = {}

class ScheduleRequest(BaseModel):
    date: str
    time: str
    platform: str
    description: Optional[str] = None
    duration: Optional[str] = "60"
    attendees: Optional[List[str]] = []
    recurrence: Optional[str] = "once"
    timezone: Optional[str] = "UTC"
    meetingType: Optional[str] = "quickSync"
    agenda: Optional[List[str]] = []
    reminder: Optional[int] = 30

class UpdateRequest(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    platform: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    attendees: Optional[List[str]] = None
    meetingType: Optional[str] = None
    agenda: Optional[List[str]] = None
    reminder: Optional[int] = None

@router.get("/")
async def list_meetings():
    return {
        "success": True,
        "meetings": list(meetings_db.values())
    }

@router.get("/availability")
async def get_availability(date: str, attendees: str = ""):
    all_slots = [
        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', 
        '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
        '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
        '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
    ]
    random.seed(date + attendees)
    k = random.randint(5, len(all_slots) - 2)
    available = sorted(random.sample(all_slots, k), key=lambda x: all_slots.index(x))
    return {
        "success": True,
        "date": date,
        "availableSlots": available
    }

# --- OAuth 2.0 Real Meeting Platform Integration ---

def get_oauth_url(platform: str, user_id: str) -> str:
    state = user_id
    if platform in ['google', 'meet']:
        try:
            flow = Flow.from_client_config(
                {"web": {
                    "client_id": os.environ.get("GOOGLE_CLIENT_ID", "mock_g_cid"),
                    "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", "mock_g_csec"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }},
                scopes=["https://www.googleapis.com/auth/calendar"]
            )
            flow.redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/meetings/auth/google/callback")
            auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline', state=state)
            return auth_url
        except Exception as e:
            logger.error(f"Google OAuth gen error: {e}")
            return f"http://localhost:5173/dashboard/schedule-meeting?error=oauth_init_fail"
            
    elif platform == 'teams':
        try:
            app = msal.ConfidentialClientApplication(
                os.environ.get("MS_CLIENT_ID", "mock_m_cid"),
                authority=os.environ.get("MS_AUTHORITY", "https://login.microsoftonline.com/common"),
                client_credential=os.environ.get("MS_CLIENT_SECRET", "mock_m_csec")
            )
            return app.get_authorization_request_url(
                scopes=["OnlineMeetings.ReadWrite"],
                redirect_uri=os.environ.get("MS_REDIRECT_URI", "http://localhost:8000/api/meetings/auth/teams/callback"),
                state=state
            )
        except Exception as e:
            logger.error(f"MSAL OAuth gen error: {e}")
            return f"http://localhost:5173/dashboard/schedule-meeting?error=oauth_init_fail"
            
    elif platform == 'zoho':
        client_id = os.environ.get("ZOHO_CLIENT_ID", "mock_z_cid")
        redirect_uri = os.environ.get("ZOHO_REDIRECT_URI", "http://localhost:8000/api/meetings/auth/zoho/callback")
        return f"https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id={client_id}&scope=ZohoMeeting.meeting.CREATE&redirect_uri={redirect_uri}&access_type=offline&state={state}"
    
    return ""

@router.get("/auth/{platform}/callback")
async def oauth_callback(platform: str, request: Request):
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    if not code or not state:
        return RedirectResponse(url="http://localhost:5173/dashboard/schedule-meeting?error=no_auth_code_or_state")

    user_id = state
    if user_id not in user_tokens_db:
        user_tokens_db[user_id] = {}

    try:
        if platform in ['google', 'meet']:
            flow = Flow.from_client_config(
                {"web": {
                    "client_id": os.environ.get("GOOGLE_CLIENT_ID", "mock_g_cid"),
                    "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", "mock_g_csec"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }},
                scopes=["https://www.googleapis.com/auth/calendar"]
            )
            flow.redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/meetings/auth/google/callback")
            flow.fetch_token(code=code)
            creds = flow.credentials
            # Expiry as unix timestamp
            expiry = creds.expiry.timestamp() if creds.expiry else (datetime.now(timezone.utc).timestamp() + 3600)
            
            # Map platform as 'meet' specifically so ensure_valid_token finds it when 'meet' is requested
            user_tokens_db[user_id]['meet'] = {
                "provider": "meet",
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "expiry": expiry
            }
        
        elif platform == 'teams':
            app = msal.ConfidentialClientApplication(
                os.environ.get("MS_CLIENT_ID", "mock_m_cid"),
                authority=os.environ.get("MS_AUTHORITY", "https://login.microsoftonline.com/common"),
                client_credential=os.environ.get("MS_CLIENT_SECRET", "mock_m_csec")
            )
            result = app.acquire_token_by_authorization_code(
                code,
                scopes=["OnlineMeetings.ReadWrite"],
                redirect_uri=os.environ.get("MS_REDIRECT_URI", "http://localhost:8000/api/meetings/auth/teams/callback")
            )
            if "access_token" in result:
                expiry = datetime.now(timezone.utc).timestamp() + result.get("expires_in", 3600)
                user_tokens_db[user_id][platform] = {
                    "provider": "teams",
                    "access_token": result["access_token"],
                    "refresh_token": result.get("refresh_token"),
                    "expiry": expiry
                }
            else:
                logger.error(f"MSAL Token missing: {result}")
                
        elif platform == 'zoho':
            client_id = os.environ.get("ZOHO_CLIENT_ID", "mock_z_cid")
            client_secret = os.environ.get("ZOHO_CLIENT_SECRET", "mock_z_csec")
            redirect_uri = os.environ.get("ZOHO_REDIRECT_URI", "http://localhost:8000/api/meetings/auth/zoho/callback")
            resp = requests.post(f"https://accounts.zoho.com/oauth/v2/token?grant_type=authorization_code&client_id={client_id}&client_secret={client_secret}&redirect_uri={redirect_uri}&code={code}")
            if resp.status_code == 200:
                data = resp.json()
                expiry = datetime.now(timezone.utc).timestamp() + data.get("expires_in", 3600)
                user_tokens_db[user_id][platform] = {
                    "provider": "zoho",
                    "access_token": data.get("access_token"),
                    "refresh_token": data.get("refresh_token"),
                    "expiry": expiry
                }
            else:
                logger.error(f"Zoho Token fetch failed: {resp.text}")

    except Exception as e:
        logger.error(f"Fatal OAuth exchange error for {platform}: {e}")
        return RedirectResponse(url=f"http://localhost:5173/dashboard/schedule-meeting?error=auth_exchange_failed")

    return RedirectResponse(url="http://localhost:5173/dashboard/schedule-meeting?auth=success")

# Helper to refresh tokens if needed
def ensure_valid_token(user_id: str, platform: str) -> bool:
    if user_id not in user_tokens_db or platform not in user_tokens_db[user_id]:
        return False
        
    token_data = user_tokens_db[user_id][platform]
    current_time = datetime.now(timezone.utc).timestamp()
    
    # If expired or expiring in next 60s
    if current_time + 60 > token_data.get("expiry", 0):
        refresh_token = token_data.get("refresh_token")
        if not refresh_token:
            return False
            
        try:
            if platform in ['google', 'meet']:
                creds = Credentials(
                    token=token_data["access_token"],
                    refresh_token=refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=os.environ.get("GOOGLE_CLIENT_ID", "mock_g_cid"),
                    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET", "mock_g_csec")
                )
                request = GoogleRequest()
                creds.refresh(request)
                token_data["access_token"] = creds.token
                token_data["expiry"] = creds.expiry.timestamp() if creds.expiry else (datetime.now(timezone.utc).timestamp() + 3600)
                
            elif platform == 'teams':
                app = msal.ConfidentialClientApplication(
                    os.environ.get("MS_CLIENT_ID", "mock_m_cid"),
                    authority=os.environ.get("MS_AUTHORITY", "https://login.microsoftonline.com/common"),
                    client_credential=os.environ.get("MS_CLIENT_SECRET", "mock_m_csec")
                )
                result = app.acquire_token_by_refresh_token(refresh_token, scopes=["OnlineMeetings.ReadWrite"])
                if "access_token" in result:
                    token_data["access_token"] = result["access_token"]
                    if "refresh_token" in result:
                        token_data["refresh_token"] = result["refresh_token"]
                    token_data["expiry"] = datetime.now(timezone.utc).timestamp() + result.get("expires_in", 3600)
                else:
                    return False
                    
            elif platform == 'zoho':
                client_id = os.environ.get("ZOHO_CLIENT_ID", "mock_z_cid")
                client_secret = os.environ.get("ZOHO_CLIENT_SECRET", "mock_z_csec")
                resp = requests.post(f"https://accounts.zoho.com/oauth/v2/token?grant_type=refresh_token&client_id={client_id}&client_secret={client_secret}&refresh_token={refresh_token}")
                if resp.status_code == 200:
                    data = resp.json()
                    token_data["access_token"] = data.get("access_token")
                    token_data["expiry"] = datetime.now(timezone.utc).timestamp() + data.get("expires_in", 3600)
                else:
                    return False
        except Exception as e:
            logger.error(f"Failed to refresh {platform} token for user {user_id}: {e}")
            return False
            
    return True

@router.post("/schedule")
async def schedule_meeting(
    request: ScheduleRequest, 
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user)
):
    user_id = str(user.get("sub"))
    platform = request.platform

    # 1. Authenticate user via OAuth (if not already connected)
    if not ensure_valid_token(user_id, platform):
        return {
            "success": True, 
            "oauthUrl": get_oauth_url(platform, user_id)
        }
        
    meeting_id = ""
    passcode = ""
    join_url = ""
    token_data = user_tokens_db[user_id][platform]

    try:
        dt_obj = datetime.strptime(f"{request.date} {request.time}", "%Y-%m-%d %I:%M %p")
        start_iso = dt_obj.isoformat() + "Z"
        end_iso = (dt_obj + timedelta(minutes=int(request.duration))).isoformat() + "Z"
        
        # 2. Create a real meeting using provider API
        if platform in ['google', 'meet']:
            creds = Credentials(token=token_data["access_token"])
            service = build('calendar', 'v3', credentials=creds)
            
            attendees_list = [{"email": email} for email in request.attendees] if request.attendees else []
            
            event = {
                "summary": request.description or f"[{request.meetingType.upper()}] Scheduled Meeting",
                "description": request.description or "",
                "start": {"dateTime": start_iso},
                "end": {"dateTime": end_iso},
                "attendees": attendees_list,
                "conferenceData": {
                    "createRequest": {"requestId": str(uuid.uuid4())}
                }
            }
            
            event = service.events().insert(calendarId='primary', body=event, conferenceDataVersion=1).execute()
            
            # Extract from response
            conf_data = event.get('conferenceData', {})
            entry_points = conf_data.get('entryPoints', [])
            for ep in entry_points:
                if ep.get('entryPointType') == 'video':
                    join_url = ep.get('uri', '')
                    break
                    
            if not join_url and event.get('hangoutLink'):
                join_url = event.get('hangoutLink')
                
            meeting_id = event.get('id', '')
            passcode = "N/A"
            
        elif platform == 'teams':
            headers = {
                "Authorization": f"Bearer {token_data['access_token']}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "subject": request.description or f"[{request.meetingType.upper()}] Scheduled Meeting",
                "startDateTime": start_iso,
                "endDateTime": end_iso
            }
            resp = requests.post("https://graph.microsoft.com/v1.0/me/onlineMeetings", json=payload, headers=headers)
            if resp.status_code in [200, 201]:
                data = resp.json()
                join_url = data.get('joinUrl', '')
                meeting_id = data.get('id', '')
                passcode = "N/A"
            else:
                logger.error(f"Teams API Error: {resp.text}")
                return {"success": False, "error": "Failed to create meeting. Please reconnect your account."}
                
        elif platform == 'zoho':
            headers = {"Authorization": f"Zoho-oauthtoken {token_data['access_token']}"}
            payload = {
                "session": {
                    "topic": request.description or f"[{request.meetingType.upper()}] Scheduled Meeting",
                    "startTime": f"{request.date}T{dt_obj.strftime('%H:%M:00')}+00:00",
                    "duration": int(request.duration)
                }
            }
            resp = requests.post("https://meeting.zoho.com/api/v2/meetings", json=payload, headers=headers)
            if resp.status_code in [200, 201]:
                data = resp.json()
                session = data.get('session', data)
                meeting_id = str(session.get('meetingKey') or session.get('sessionKey', ''))
                join_url = session.get('joinLink') or session.get('joinUrl') or session.get('join_url', '')
                passcode = str(session.get('meetingPassword') or session.get('password', 'N/A'))
            else:
                logger.error(f"Zoho API Error: {resp.text}")
                return {"success": False, "error": "Failed to create meeting. Please reconnect your account."}

    except Exception as e:
         logger.error(f"API Exec error for {platform}: {e}")
         return {"success": False, "error": "Failed to create meeting. Please reconnect your account."}

    # NEVER generate dummy links. If API fails, return error.
    if not meeting_id or not join_url:
        return {"success": False, "error": "Failed to create meeting. Please reconnect your account."}

    # 3. Store and display this data in UI
    meeting_data = {
        "id": meeting_id,
        "title": f"[{request.meetingType.upper()}] Scheduled Meeting",
        "date": request.date,
        "time": request.time,
        "platform": platform,
        "duration": request.duration,
        "attendees": request.attendees,
        "meetingType": request.meetingType,
        "agenda": request.agenda,
        "reminder": request.reminder,
        "description": request.description,
        "status": "scheduled",
        "joinUrl": join_url,
        "passcode": passcode,
        "momIntegrationId": f"mom_task_{uuid.uuid4().hex[:6]}",
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    meetings_db[meeting_id] = meeting_data
    
    # 4. Send email invite with real meeting details
    background_tasks.add_task(send_meeting_email_sync, "invite", meeting_data)
    
    return {
        "success": True,
        "meeting": meeting_data
    }

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str):
    if meeting_id not in meetings_db:
        # DO NOT fallback to mock generation. 
        raise HTTPException(status_code=404, detail="Meeting not found")

    return {
        "success": True,
        "meeting": meetings_db[meeting_id]
    }

@router.patch("/{meeting_id}")
async def update_meeting(meeting_id: str, request: UpdateRequest, background_tasks: BackgroundTasks):
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meeting = meetings_db[meeting_id]
    update_data = request.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        meeting[key] = value
        
    if 'meetingType' in update_data:
         meeting['title'] = f"[{meeting['meetingType'].upper()}] Scheduled Meeting"
         
    meetings_db[meeting_id] = meeting
    
    background_tasks.add_task(send_meeting_email_sync, "update", meeting)
    
    return {
        "success": True,
        "meeting": meeting
    }

@router.post("/{meeting_id}/cancel")
async def cancel_meeting(meeting_id: str, background_tasks: BackgroundTasks):
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meetings_db[meeting_id]["status"] = "cancelled"
    
    background_tasks.add_task(send_meeting_email_sync, "cancellation", meetings_db[meeting_id])
    
    return {
        "success": True,
        "message": "Meeting cancelled successfully",
        "meeting": meetings_db[meeting_id]
    }
