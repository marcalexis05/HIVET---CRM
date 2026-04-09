import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_orders_branch():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, status, branch_id FROM orders WHERE clinic_id = 2")).fetchall()
        for r in res:
            print(f"Order {r.id}, Status: {r.status}, Branch: {r.branch_id}")

if __name__ == "__main__":
    check_orders_branch()
