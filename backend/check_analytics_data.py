import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def inspect_data():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("--- BUSINESS 1 BRANCHES ---")
        branches = conn.execute(text("SELECT id, name, is_main FROM business_branches WHERE business_id = 1")).fetchall()
        for b in branches:
            print(f"ID: {b[0]}, Name: {b[1]}, IsMain: {b[2]}")
            
        print("\n--- ORDERS FOR BUSINESS 1 GROUPED BY BRANCH_ID ---")
        orders = conn.execute(text("SELECT branch_id, COUNT(*), SUM(total_amount) FROM orders WHERE clinic_id = 1 GROUP BY branch_id")).fetchall()
        for o in orders:
            print(f"BranchID: {o[0]}, Count: {o[1]}, Revenue: {o[2]}")

if __name__ == "__main__":
    inspect_data()
