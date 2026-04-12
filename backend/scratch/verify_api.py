import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import Order, RiderProfile, get_available_jobs, get_db

DB_URL = "postgresql://postgres:0428@localhost:5432/hivet"
engine = create_engine(DB_URL)

def mock_get_db():
    with Session(engine) as session:
        yield session

# Mock current_user
# Let's say User ID 103 corresponds to Rider ID 4
current_user = {"sub": "103", "role": "rider"}

# Run the actual function
import asyncio

async def test():
    db = next(mock_get_db())
    try:
        result = await get_available_jobs(db, current_user)
        print("API Result:")
        print(f"  Order Count: {len(result['orders'])}")
        for o in result['orders']:
            print(f"  - Order #{o['id']}: {o['status']} at {o['pickup_name']}")
    except Exception as e:
        print(f"API Error: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test())
