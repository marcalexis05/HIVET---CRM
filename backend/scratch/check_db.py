from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
import os

# Assuming SQLite for local dev
DB_URL = "sqlite:///./sql_app.db"
if not os.path.exists("./sql_app.db"):
    # Check if it's named something else
    print("Database file not found at ./sql_app.db")

from main import Order, RiderProfile, Base

engine = create_engine(DB_URL)

with Session(engine) as session:
    orders = session.query(Order).all()
    print(f"Total Orders: {len(orders)}")
    for o in orders:
        print(f"Order #{o.id}: Status={o.status}, Method={o.fulfillment_method}, Rider={o.rider_id}")
    
    riders = session.query(RiderProfile).all()
    print(f"\nTotal Riders: {len(riders)}")
    for r in riders:
        print(f"Rider #{r.id}: Online={r.is_online}, Lat={r.current_lat}, Lng={r.current_lng}")
