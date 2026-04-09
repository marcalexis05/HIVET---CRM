import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_order_statuses():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT status, count(*) FROM orders GROUP BY status")).fetchall()
        print("All Order Statuses in DB:", res)
        
        # Check for Business 2 (Alpha) specifically
        res2 = conn.execute(text("SELECT status, count(*) FROM orders WHERE clinic_id = 2 GROUP BY status")).fetchall()
        print("Business 2 Order Statuses:", res2)

if __name__ == "__main__":
    check_order_statuses()
