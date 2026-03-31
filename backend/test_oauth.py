from google_auth_oauthlib.flow import Flow
import msal

try:
    flow = Flow.from_client_config(
        {"web": {
            "client_id": "mock_g_cid",
            "client_secret": "mock_g_csec",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }},
        scopes=["https://www.googleapis.com/auth/calendar"]
    )
    flow.redirect_uri = "http://localhost:8000/api/meetings/auth/google/callback"
    auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline', state="test")
    print("Google:", auth_url)
except Exception as e:
    print("Google error:", e)

try:
    app = msal.ConfidentialClientApplication(
        "mock_m_cid",
        authority="https://login.microsoftonline.com/common",
        client_credential="mock_m_csec"
    )
    auth_url = app.get_authorization_request_url(
        scopes=["OnlineMeetings.ReadWrite", "offline_access"],
        redirect_uri="http://localhost:8000/api/meetings/auth/teams/callback",
        state="test"
    )
    print("MSAL:", auth_url)
except Exception as e:
    print("MSAL error:", e)
