
import sqlite3
import os

db_path = r'c:\Apache24\htdocs\HIVET - CRM\backend\hivet.db'
if not os.path.exists(db_path):
    # Try different name based on list_dir
    db_path = r'c:\Apache24\htdocs\HIVET - CRM\backend\main.db'

def check_revenue():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Find business ID for Alpha Veterinary Clinic
    cursor.execute("SELECT id, clinic_name FROM business_profiles WHERE clinic_name LIKE '%Alpha%'")
    biz = cursor.fetchone()
    if not biz:
        print("Clinic not found")
        return
    
    biz_id = biz['id']
    print(f"Found Business: {biz['clinic_name']} (ID: {biz_id})")

    # Find branches
    cursor.execute("SELECT id, name, is_main FROM business_branches WHERE business_id = ?", (biz_id,))
    branches = cursor.fetchall()
    branch_map = {b['id']: b['name'] for b in branches}
    print("Branches:")
    for b in branches:
        print(f"  - ID: {b['id']}, Name: {b['name']}, Main: {b['is_main']}")

    # Check Product Revenue (Successful Orders)
    # Statuses not in ('Cancelled', 'Pending')
    print("\n--- Product Revenue ---")
    cursor.execute("""
        SELECT o.branch_id, SUM(oi.price * oi.quantity) as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE p.business_id = ? AND o.status NOT IN ('Cancelled', 'Pending')
        GROUP BY o.branch_id
    """, (biz_id,))
    prod_revs = cursor.fetchall()
    total_prod_rev = 0
    for r in prod_revs:
        branch_name = branch_map.get(r['branch_id'], 'None/Unknown')
        print(f"  Branch: {branch_name} (ID: {r['branch_id']}), Revenue: {r['revenue']}")
        total_prod_rev += r['revenue']
    print(f"Total Product Revenue: {total_prod_rev}")

    # Check Service Revenue (Successful Reservations)
    # Statuses in ('Completed', 'Confirmed')
    print("\n--- Service Revenue ---")
    cursor.execute("""
        SELECT branch_id, SUM(total_amount) as revenue
        FROM reservations
        WHERE business_id = ? AND status IN ('Completed', 'Confirmed')
        GROUP BY branch_id
    """, (biz_id,))
    serv_revs = cursor.fetchall()
    total_serv_rev = 0
    for r in serv_revs:
        branch_name = branch_map.get(r['branch_id'], 'None/Unknown')
        print(f"  Branch: {branch_name} (ID: {r['branch_id']}), Revenue: {r['revenue']}")
        total_serv_rev += r['revenue']
    print(f"Total Service Revenue: {total_serv_rev}")

    print(f"\nGRAND TOTAL REVENUE (Combined): {total_prod_rev + total_serv_rev}")

    conn.close()

if __name__ == "__main__":
    check_revenue()
