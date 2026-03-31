import requests

headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer DUMMY_LATER_IF_NEEDED'
}

body = {
    "date": "2026-04-15",
    "time": "10:00 AM",
    "platform": "google",
    "description": "Test",
    "duration": "60",
    "attendees": ["test@example.com"],
    "recurrence": "once",
    "timezone": "UTC",
    "meetingType": "quickSync",
    "agenda": ["Test"]
}

# we need a real token to pass Depends(get_current_user)
# Let's mock a valid jwt token first.
import jwt
import datetime

token = jwt.encode(
    {"sub": "123", "type": "access", "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
    "change-this-secret",
    algorithm="HS256"
)

headers['Authorization'] = f'Bearer {token}'

response = requests.post("http://localhost:8000/api/meetings/schedule", json=body, headers=headers)
print("GOOGLE:", response.status_code, response.text)

body["platform"] = "teams"
response = requests.post("http://localhost:8000/api/meetings/schedule", json=body, headers=headers)
print("TEAMS:", response.status_code, response.text)
