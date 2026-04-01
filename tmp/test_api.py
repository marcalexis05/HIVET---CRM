import requests
import json

URL = "http://localhost:8000/api/admin/revenue-analytics"
HEADERS = {
    "Authorization": "Bearer super-admin-token" # I need to get a real token or mock it
}

# Since I can't easily get a token without logging in, I'll just check if the endpoint exists and returns 401/403 which confirms it's there.
try:
    resp = requests.get(URL, params={"period": "6m"})
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
