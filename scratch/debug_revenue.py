
import asyncio
from sqlalchemy import create_engine, text, or_
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Try alternate location
    load_dotenv('backend.env')
    DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

async def debug_revenue(biz_id, branch_id):
    db = SessionLocal()
    try:
        # get_business_orders logic
        query1 = text("""
            SELECT oi.id, oi.price, oi.quantity, o.status, o.branch_id
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE p.business_id = :biz_id
            AND o.status != 'Payment Pending'
        """)
        results1 = db.execute(query1, {"biz_id": biz_id}).fetchall()
        
        items1 = []
        rev1 = 0
        for r in results1:
            if branch_id and not (r.branch_id == branch_id or r.branch_id is None):
                continue
            if r.status not in ['Cancelled', 'Pending']:
                rev1 += (r.price or 0) * (r.quantity or 0)
                items1.append(f"ID:{r.id} P:{r.price} Q:{r.quantity} S:{r.status}")
        
        # get_business_analytics logic
        query2 = text("""
            SELECT oi.id, oi.price, oi.quantity, o.status, o.branch_id
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON p.id = oi.product_id
            WHERE p.business_id = :biz_id
            AND o.status NOT IN ('Cancelled', 'Pending', 'Payment Pending')
        """)
        results2 = db.execute(query2, {"biz_id": biz_id}).fetchall()
        items2 = []
        rev2 = 0
        for r in results2:
            if branch_id and not (r.branch_id == branch_id or r.branch_id is None):
                continue
            rev2 += (r.price or 0) * (r.quantity or 0)
            items2.append(f"ID:{r.id} P:{r.price} Q:{r.quantity} S:{r.status}")
            
        print(f"DEBUG REVENUE FOR BIZ {biz_id}, BRANCH {branch_id}")
        print(f"Orders Page Revenue: {rev1} (Items: {len(items1)})")
        print(f"Dashboard Revenue: {rev2} (Items: {len(items2)})")
        
        print("\nItems only in Dashboard:")
        diff = set(items2) - set(items1)
        for d in sorted(list(diff)):
            print(f"  {d}")
        
    finally:
        db.close()

if __name__ == "__main__":
    # From screenshot: Alpha Veterinary Clinic. 
    # I need to find its ID. I'll search business_profiles.
    db = SessionLocal()
    clinic = db.execute(text("SELECT id FROM business_profiles WHERE clinic_name LIKE 'Alpha%'")).fetchone()
    if clinic:
        asyncio.run(debug_revenue(clinic.id, 6)) # Ruby St Branch is 6
        branch = db.execute(text("SELECT id, name FROM business_branches WHERE business_id = :id"), {"id": clinic.id}).fetchall()
        print(f"Branches for clinic {clinic.id}: {branch}")
    else:
        print("Clinic not found")
    db.close()
