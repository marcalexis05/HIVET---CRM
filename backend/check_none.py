import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_none_values():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id FROM order_items WHERE price IS NULL OR quantity IS NULL")).fetchall()
        print("Order Items with NULL price/qty:", res)
        
        res2 = conn.execute(text("SELECT id FROM reservations WHERE total_amount IS NULL")).fetchall()
        print("Reservations with NULL total_amount:", res2)

if __name__ == "__main__":
    check_none_values()
