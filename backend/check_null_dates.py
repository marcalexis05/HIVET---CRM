import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_null_dates():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id FROM orders WHERE created_at IS NULL")).fetchall()
        print("Orders with NULL created_at:", res)

if __name__ == "__main__":
    check_null_dates()
