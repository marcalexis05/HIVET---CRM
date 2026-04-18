import os
from datetime import datetime, timedelta
import random
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def seed_alpha_orders():
    with engine.connect() as conn:
        # 1. Get Alpha Biz ID
        biz = conn.execute(text("SELECT id FROM business_profiles WHERE clinic_name LIKE '%Alpha%'")).first()
        if not biz:
            print("Alpha clinic not found.")
            return
        biz_id = biz[0]
        
        # 2. Get some customers
        customers = conn.execute(text("SELECT id FROM customer LIMIT 10")).fetchall()
        if not customers:
            print("No customers found.")
            return
        
        # 3. Generate some orders
        now = datetime.utcnow()
        for _ in range(30):
            cust_id = random.choice(customers)[0]
            days_ago = random.randint(0, 180)
            order_date = now - timedelta(days=days_ago)
            amount = random.randint(500, 5000)
            
            conn.execute(text(f"""
                INSERT INTO orders (customer_id, status, total_amount, fulfillment_method, payment_method, created_at, clinic_id)
                VALUES ({cust_id}, 'Completed', {amount}, 'pickup', 'Cash', '{order_date.strftime('%Y-%m-%d %H:%M:%S')}', {biz_id})
            """))
            
        conn.commit()
        print(f"Successfully seeded 30 orders for Alpha (ID: {biz_id})")

if __name__ == "__main__":
    seed_alpha_orders()
