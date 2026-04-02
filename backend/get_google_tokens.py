"""
Run this script ONCE to get a valid Google refresh_token.
It will open your browser, ask you to sign in with Google,
then print the access_token and refresh_token to copy into .env.

Usage:
    python get_google_tokens.py
"""
import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
]

CLIENT_CONFIG = {
    "installed": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}

def main():
    print("\n=== Google OAuth Token Generator ===")
    print("A browser window will open. Sign in and grant Calendar permissions.")
    print("After approval, come back here to see your tokens.\n")

    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
    creds = flow.run_local_server(port=8080, prompt="consent", access_type="offline")

    print("\n✅ SUCCESS! Copy these into your .env file:\n")
    print(f"GOOGLE_OAUTH_TOKEN={creds.token}")
    print(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
    print("\nDone. You can delete this script afterwards.")

if __name__ == "__main__":
    main()
