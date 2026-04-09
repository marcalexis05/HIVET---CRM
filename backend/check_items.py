import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_order_items():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, order_id FROM order_items WHERE order_id IN (98, 75, 76)")).fetchall()
        print("Items for Pending Orders:", res)

if __name__ == "__main__":
    check_order_items()
