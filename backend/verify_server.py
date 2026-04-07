import requests

BASE_URL = "http://localhost:8000"

def test_health():
    try:
        res = requests.get(f"{BASE_URL}/api/reservations")
        print(f"Health check status: {res.status_code}")
        return res.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

if __name__ == "__main__":
    if test_health():
        print("Backend is UP and responding.")
    else:
        print("Backend is still DOWN or not responding correctly.")
