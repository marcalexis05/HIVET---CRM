
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def run_diagnostics():
    with engine.connect() as conn:
        # 1. Find the clinic
        result = conn.execute(text("SELECT id, clinic_name FROM business_profiles WHERE clinic_name ILIKE '%Alpha%'")).fetchone()
        if not result:
            print("Clinic not found")
            return
        biz_id, clinic_name = result
        print(f"Found Business: {clinic_name} (ID: {biz_id})")

        # 2. Find branches
        branches = conn.execute(text("SELECT id, name, is_main FROM business_branches WHERE business_id = :biz_id"), {"biz_id": biz_id}).fetchall()
        branch_map = {b[0]: b[1] for b in branches}
        main_branch_id = next((b[0] for b in branches if b[2]), None)
        print("Branches:")
        for b in branches:
            print(f"  - ID: {b[0]}, Name: {b[1]}, Main: {b[2]}")
        print(f"Main Branch ID: {main_branch_id}")

        # 3. Analyze Order Revenue
        print("\n--- Orders Analysis ---")
        orders = conn.execute(text("""
            SELECT o.branch_id, SUM(oi.price * oi.quantity) as revenue, COUNT(DISTINCT o.id) as count
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE p.business_id = :biz_id AND o.status NOT IN ('Cancelled', 'Pending')
            GROUP BY o.branch_id
        """), {"biz_id": biz_id}).fetchall()
        for o in orders:
            print(f"  Branch ID: {o[0]} ({branch_map.get(o[0], 'None/Other')}), Revenue: {o[1]}, Orders: {o[2]}")

        # 4. Analyze Reservation Revenue
        print("\n--- Reservations Analysis ---")
        reservations = conn.execute(text("""
            SELECT branch_id, SUM(total_amount) as revenue, COUNT(*) as count
            FROM reservations
            WHERE business_id = :biz_id AND status IN ('Completed', 'Confirmed')
            GROUP BY branch_id
        """), {"biz_id": biz_id}).fetchall()
        for r in reservations:
            print(f"  Branch ID: {r[0]} ({branch_map.get(r[0], 'None/Other')}), Revenue: {r[1]}, Appts: {r[2]}")

if __name__ == "__main__":
    run_diagnostics()
