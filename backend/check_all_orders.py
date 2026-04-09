import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_all_orders():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, clinic_id, branch_id, status FROM orders")).fetchall()
        print("ALL Orders in DB:")
        for r in res:
            print(r)

if __name__ == "__main__":
    check_all_orders()
