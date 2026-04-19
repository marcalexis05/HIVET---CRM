import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def fix_mismatches():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # 1. Update Ruby St. reservations
    # Target: "Ruby St. Branch" (ID 6)
    # We look for location containing "Ruby St." and business_id = 2
    cur.execute("""
        UPDATE reservations 
        SET branch_id = 6 
        WHERE business_id = 2 
        AND location ILIKE '%Ruby St.%' 
        AND (branch_id IS NULL OR branch_id != 6)
    """)
    rows_fixed = cur.rowcount
    
    conn.commit()
    print(f"Successfully updated {rows_fixed} reservations for Ruby St. Branch.")
    
    # Verify
    cur.execute("SELECT id, pet_name, branch_id FROM reservations WHERE business_id = 2 AND location ILIKE '%Ruby St.%'")
    updates = cur.fetchall()
    for u in updates:
        print(f"Verified -> Reservation ID: {u[0]} | Pet: {u[1]} | BranchID: {u[2]}")
        
    conn.close()

if __name__ == "__main__":
    fix_mismatches()
