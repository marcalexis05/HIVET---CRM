import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def test_query():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    business_id = 2
    branch_id = 7
    
    query = f"""
    SELECT oi.id, o.id, p.id, c.id
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    JOIN customer c ON o.customer_id = c.id
    WHERE o.clinic_id = {business_id}
    AND o.status != 'Payment Pending'
    AND o.branch_id = {branch_id}
    """
    
    res = db.execute(text(query)).fetchall()
    print(f"Results for Biz {business_id}, Branch {branch_id}: {len(res)} items found.")
    for r in res:
        print(r)
        
    db.close()

if __name__ == "__main__":
    test_query()
