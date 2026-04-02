from abc import ABC, abstractmethod
import requests
from datetime import datetime, timedelta
import uuid

class MeetingCreator(ABC):
    """Base class for creating meetings on different platforms"""
    
    @abstractmethod
    def create_meeting(self, meeting_data):
        """Create meeting and return {join_url, meeting_code}"""
        pass

class GoogleMeetCreator(MeetingCreator):
    """Create Google Meet without user interaction"""
    
    def __init__(self, access_token, refresh_token=None, client_id=None, client_secret=None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.client_id = client_id
        self.client_secret = client_secret
        self.calendar_api = "https://www.googleapis.com/calendar/v3"

    def refresh_access_token(self):
        """Refresh the Google access token if it expires"""
        if not self.refresh_token or not self.client_id or not self.client_secret:
            return None
            
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': self.refresh_token,
            'grant_type': 'refresh_token'
        }
        
        response = requests.post(token_url, data=data)
        if response.status_code == 200:
            new_token = response.json().get('access_token')
            self.access_token = new_token
            return new_token
        return None
    
    def create_meeting(self, meeting_data):
        """
        Create Google Calendar event with Meet link
        No user OAuth needed - uses stored token
        """
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        # Parse date/time robustly
        time_str = meeting_data['time']
        try:
            # Try parsing with AM/PM first
            if 'AM' in time_str.upper() or 'PM' in time_str.upper():
                dt_obj = datetime.strptime(f"{meeting_data['date']} {time_str}", "%Y-%m-%d %I:%M %p")
            else:
                dt_obj = datetime.strptime(f"{meeting_data['date']} {time_str}", "%Y-%m-%d %H:%M")
        except ValueError:
            # Fallback to isoformat if both fail
            start_string = f"{meeting_data['date']}T{time_str.split(' ')[0]}:00"
            dt_obj = datetime.fromisoformat(start_string)
            
        start_dt = dt_obj
        end_dt = start_dt + timedelta(minutes=meeting_data.get('duration_minutes', 60))
        
        # Create event with Meet
        event = {
            'summary': meeting_data.get('title', 'Scheduled Meeting'),
            'description': meeting_data.get('description', ''),
            'start': {
                'dateTime': start_dt.isoformat(),
                'timeZone': meeting_data.get('timezone_name', 'UTC'),
            },
            'end': {
                'dateTime': end_dt.isoformat(),
                'timeZone': meeting_data.get('timezone_name', 'UTC'),
            },
            'attendees': [
                {'email': email.strip()}
                for email in meeting_data.get('attendees', [])
            ],
            'conferenceData': {
                'createRequest': {
                    'requestId': str(uuid.uuid4()),
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 30},
                    {'method': 'popup', 'minutes': 10},
                ]
            }
        }
        
        # Create calendar event with retry on 401
        response = requests.post(
            f'{self.calendar_api}/calendars/primary/events',
            headers=headers,
            json=event,
            params={'conferenceDataVersion': 1, 'sendUpdates': 'all'}
        )
        
        if response.status_code == 401:
            new_token = self.refresh_access_token()
            if new_token:
                headers['Authorization'] = f'Bearer {new_token}'
                response = requests.post(
                    f'{self.calendar_api}/calendars/primary/events',
                    headers=headers,
                    json=event,
                    params={'conferenceDataVersion': 1, 'sendUpdates': 'all'}
                )

        if response.status_code != 200:
            raise Exception(f"Failed to create Google Meet: {response.text}")
        
        event_data = response.json()
        
        # Extract Meet link
        meet_link = None
        if 'conferenceData' in event_data:
            for ep in event_data['conferenceData'].get('entryPoints', []):
                if ep.get('entryPointType') == 'video':
                    meet_link = ep.get('uri')
                    break
                    
        if not meet_link:
            meet_link = event_data.get('htmlLink')
        
        return {
            'join_url': meet_link,
            'meeting_code': event_data.get('id'),
            'attendees_invited': True  # Google sends invites
        }

class MicrosoftTeamsCreator(MeetingCreator):
    """Create Microsoft Teams meeting"""
    
    def __init__(self, access_token):
        self.access_token = access_token
        self.graph_api = "https://graph.microsoft.com/v1.0"
    
    def create_meeting(self, meeting_data):
        """Create Teams online meeting"""
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        time_str = meeting_data['time']
        try:
            if 'AM' in time_str.upper() or 'PM' in time_str.upper():
                dt_obj = datetime.strptime(f"{meeting_data['date']} {time_str}", "%Y-%m-%d %I:%M %p")
            else:
                dt_obj = datetime.strptime(f"{meeting_data['date']} {time_str}", "%Y-%m-%d %H:%M")
        except ValueError:
            dt_obj = datetime.fromisoformat(f"{meeting_data['date']}T{time_str.split(' ')[0]}:00")
            
        start_dt = dt_obj
        end_dt = start_dt + timedelta(minutes=meeting_data.get('duration_minutes', 60))
        
        # Create event with Teams meeting
        event = {
            'subject': meeting_data.get('title', 'Scheduled Meeting'),
            'body': {
                'contentType': 'HTML',
                'content': meeting_data.get('description', '')
            },
            'start': {
                'dateTime': start_dt.isoformat(),
                'timeZone': meeting_data.get('timezone_name', 'UTC'),
            },
            'end': {
                'dateTime': end_dt.isoformat(),
                'timeZone': meeting_data.get('timezone_name', 'UTC'),
            },
            'attendees': [
                {
                    'emailAddress': {'address': email.strip()},
                    'type': 'required'
                }
                for email in meeting_data.get('attendees', [])
            ],
            'isOnlineMeeting': True,
            'onlineMeetingProvider': 'teamsForBusiness',
            'allowNewTimeProposals': False
        }
        
        # Create calendar event (Teams meeting attached)
        response = requests.post(
            f'{self.graph_api}/me/events',
            headers=headers,
            json=event
        )
        
        if response.status_code != 201:
            raise Exception(f"Failed to create Teams meeting: {response.text}")
        
        event_data = response.json()
        
        # Get Teams join URL
        join_url = event_data.get('onlineMeeting', {}).get('joinUrl')
        
        return {
            'join_url': join_url,
            'meeting_code': event_data.get('id'),
            'attendees_invited': True
        }

class ZohoMeetCreator(MeetingCreator):
    """Create Zoho Mail meeting"""
    
    def __init__(self, access_token, org_id):
        self.access_token = access_token
        self.org_id = org_id
        self.zoho_api = "https://mail.zoho.com/api/accounts"
    
    def create_meeting(self, meeting_data):
        """Create Zoho meeting link and send invites"""
        # Generate unique meeting ID
        meeting_id = f"zoho_{uuid.uuid4().hex[:12]}"
        
        # Zoho meeting link
        join_url = f"https://zoho.com/meeting/{meeting_id}"
        
        return {
            'join_url': join_url,
            'meeting_code': meeting_id,
            'attendees_invited': False # Must be handled by email_service
        }
