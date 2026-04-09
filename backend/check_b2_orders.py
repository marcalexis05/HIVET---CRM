import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_business_2_orders():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, branch_id, clinic_id FROM orders WHERE clinic_id = 2")).fetchall()
        print("Business 2 Orders in DB:", res)

if __name__ == "__main__":
    check_business_2_orders()
