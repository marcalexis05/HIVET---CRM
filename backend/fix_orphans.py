import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def fix_orphaned_orders():
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        # Assign orders on Branch 7 to Clinic 2
        conn.execute(text("UPDATE orders SET clinic_id = 2 WHERE branch_id = 7 AND clinic_id IS NULL"))
        # Assign orders on Branch 3 to Clinic 1
        conn.execute(text("UPDATE orders SET clinic_id = 1 WHERE branch_id = 3 AND clinic_id IS NULL"))
        print("Orphaned orders fixed.")

if __name__ == "__main__":
    fix_orphaned_orders()
