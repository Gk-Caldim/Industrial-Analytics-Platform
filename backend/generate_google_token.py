import os
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

load_dotenv()

# We need the Google Client ID and Secret from the .env file
client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()

if not client_id or not client_secret:
    print("ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env file.")
    exit(1)

SCOPES = ['https://www.googleapis.com/auth/calendar']

client_config = {
    "installed": {
        "client_id": client_id,
        "project_id": "industrial-analytics",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": client_secret,
        "redirect_uris": ["http://localhost:8080/"]
    }
}

def main():
    print("Starting local OAuth flow on port 8080. A browser window should open...")
    print("If the browser DOES NOT open automatically, copy the URL below and paste it into Chrome.")
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    creds = flow.run_local_server(host='localhost', port=8080)
    
    print("\n" + "="*50)
    print("SUCCESS! Your credentials have been generated.")
    print("="*50)
    
    print("\nCopy the following token and paste it into your .env file:\n")
    print(f"GOOGLE_OAUTH_TOKEN={creds.token}")
    
    if creds.refresh_token:
        print(f"\nYour Refresh Token (Save this as well if you need it later):\n{creds.refresh_token}")
        
    print("\n" + "="*50)

if __name__ == '__main__':
    main()
