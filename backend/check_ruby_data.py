import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_data():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # 1. Find the business ID for Alpha Veterinary Clinic
    cur.execute("SELECT id, clinic_name FROM business_profiles WHERE clinic_name ILIKE '%Alpha Veterinary%'")
    biz = cur.fetchone()
    if not biz:
        print("Business not found")
        return
    biz_id = biz[0]
    print(f"Found Business ID: {biz_id} ({biz[1]})")
    
    # 2. List all branches
    print("\n--- Branches ---")
    cur.execute("SELECT id, name, is_main FROM business_branches WHERE business_id = %s", (biz_id,))
    branches = cur.fetchall()
    for b in branches:
        print(f"ID: {b[0]} | Name: {b[1]} | Is Main: {b[2]}")
    
    # 3. Find the specific reservation
    print("\n--- Target Reservation (Completed, Ruby St.) ---")
    cur.execute("""
        SELECT id, pet_name, service, date, total_amount, status, branch_id, location 
        FROM reservations 
        WHERE business_id = %s AND status = 'Completed' 
        ORDER BY created_at DESC LIMIT 5
    """, (biz_id,))
    resvs = cur.fetchall()
    for r in resvs:
        print(f"ID: {r[0]} | Pet: {r[1]} | Service: {r[2]} | Date: {r[3]} | Total: {r[4]} | Status: {r[5]} | BranchID: {r[6]} | Location: {r[7]}")

    conn.close()

if __name__ == "__main__":
    check_data()
