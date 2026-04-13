import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import Order, RiderProfile, get_available_jobs

DB_URL = "postgresql://postgres:0428@localhost:5432/hivet"
engine = create_engine(DB_URL)

with Session(engine) as db:
    # Find the rider from the screenshot
    rider = db.query(RiderProfile).filter(RiderProfile.name.like("%Val Javez%")).first()
    if not rider:
        print("Rider not found.")
        sys.exit(1)
    
    print(f"DEBUG: Found Rider: {rider.name} (ID: {rider.id}, Role: {rider.role}, Compliance: {rider.compliance_status})")
    
    # Simulate current_user as if this rider logged in
    # In main.py, sub is user.id. Since he's in rider_profiles, id is his RiderProfile.id.
    current_user = {
        "sub": str(rider.id),
        "role": rider.role,
        "email": rider.email
    }
    
    import asyncio
    async def run():
        try:
            res = await get_available_jobs(db, current_user)
            print(f"API Result: {len(res['orders'])} orders found.")
            for o in res['orders']:
                print(f"  - {o['id']} ({o['pickup_name']})")
        except Exception as e:
            print(f"API Error: {e}")
    
    asyncio.run(run())
