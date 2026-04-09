import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_invalid_customers():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, customer_id FROM orders WHERE customer_id NOT IN (SELECT id FROM customer)")).fetchall()
        print("Orders with invalid customers:", res)

if __name__ == "__main__":
    check_invalid_customers()
