import httpx
import sys
import os

# Create a mock token or use an existing one if possible
# Since we are on the server, we can't easily get a token without login.
# But we can query the DB to see why the API returns what it returns.

import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import Order, RiderProfile, get_distance

DB_URL = "postgresql://postgres:0428@localhost:5432/hivet"
engine = create_engine(DB_URL)

with Session(engine) as db:
    # 1. Simulate the fetch logic
    orders = db.query(Order).filter(
        Order.status.in_(["Pending", "Processing"]),
        Order.fulfillment_method == "delivery",
        Order.rider_id == None
    ).all()
    
    print(f"Total Candidate Orders: {len(orders)}")
    
    # Simulate a rider (let's say the one in the screenshot)
    # Val Javea Lamson - let's find him
    rider = db.query(RiderProfile).filter(RiderProfile.last_name == "Lamson").first()
    if not rider:
        print("Rider 'Lamson' not found in DB.")
        # Try any rider
        rider = db.query(RiderProfile).first()
    
    if rider:
        print(f"Testing for Rider: {rider.name} (ID: {rider.id})")
        print(f"  Rider Location: {rider.current_lat}, {rider.current_lng}")
        
        for o in orders:
            # Pickup logic
            pickup_lat, pickup_lng = None, None
            if o.branch_id:
                # ... branch logic ...
                pass
            
            distance = 0.0
            if rider and rider.current_lat and rider.current_lng and pickup_lat and pickup_lng:
                distance = get_distance(rider.current_lat, rider.current_lng, pickup_lat, pickup_lng)
            
            print(f"Order #{o.id}: Status={o.status}, Distance={distance}km")
            
            if distance > 20.0 and rider and rider.current_lat:
                print(f"  -> WOULD BE FILTERED OUT (Dist > 20km)")
            else:
                print(f"  -> SHOULD BE VISIBLE")
    else:
        print("No riders found to test with.")
