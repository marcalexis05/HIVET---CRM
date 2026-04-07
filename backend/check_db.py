import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    print("=== PRODUCTS WITH THEIR REAL OWNERS ===")
    rows = conn.execute(text("""
        SELECT p.id, p.name, p.business_id, bp.clinic_name
        FROM products p
        LEFT JOIN business_profiles bp ON bp.id = p.business_id
        ORDER BY p.business_id, p.id
    """)).fetchall()
    for r in rows:
        print(f"  Product {r[0]:>3}: '{r[1][:40]}' | business_id={r[2]} | clinic='{r[3]}'")

    print("\n=== ORDER 103 ITEMS ===")
    rows2 = conn.execute(text("""
        SELECT oi.order_id, oi.product_id, oi.product_name, p.business_id, bp.clinic_name
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN business_profiles bp ON bp.id = p.business_id
        WHERE oi.order_id IN (SELECT id FROM orders ORDER BY created_at DESC LIMIT 5)
        ORDER BY oi.order_id DESC
    """)).fetchall()
    for r in rows2:
        print(f"  Order {r[0]}, Product {r[1]}: '{r[2]}' | business_id={r[3]} | clinic='{r[4]}'")
