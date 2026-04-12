import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import Order, RiderProfile

# Get DB URL from environment if possible, else fallback
# In this environment, we know it from .env or just use the string
DB_URL = "postgresql://postgres:0428@localhost:5432/hivet"

engine = create_engine(DB_URL)

with Session(engine) as session:
    order_id = 123
    o = session.query(Order).filter(Order.id == order_id).first()
    if o:
        print(f"Order #{o.id} found:")
        print(f"  Status: {o.status}")
        print(f"  Fulfillment: {o.fulfillment_method}")
        print(f"  Rider: {o.rider_id}")
        print(f"  Clinic ID: {o.clinic_id}")
        print(f"  Branch ID: {o.branch_id}")
    else:
        print(f"Order #{order_id} not found.")
        # Print last 5 orders
        last_orders = session.query(Order).order_by(Order.id.desc()).limit(5).all()
        print("\nLast 5 orders:")
        for lo in last_orders:
            print(f"  Order #{lo.id}: Status={lo.status}, Method={lo.fulfillment_method}")
