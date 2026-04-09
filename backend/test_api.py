import requests

def test_analytics():
    # We need a token. We'll use one if we have it, or just try to see the error.
    # Since I don't have a token, I'll see if I can get a 401/403 (meaning it's alive)
    # or a 500 (meaning it's broken).
    try:
        url = "http://localhost:8000/api/business/dashboard/analytics"
        r = requests.get(url)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.text[:200]}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_analytics()
