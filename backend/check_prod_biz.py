import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_prod_biz():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Check products in order 98
        res = conn.execute(text("SELECT p.id, p.business_id FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = 98")).fetchall()
        print("Products in Order 98:", res)
        
        # Check customer names
        res2 = conn.execute(text("SELECT c.id, c.name FROM customer c JOIN orders o ON c.id = o.customer_id WHERE o.id = 98")).fetchall()
        print("Customer for Order 98:", res2)

if __name__ == "__main__":
    check_prod_biz()
