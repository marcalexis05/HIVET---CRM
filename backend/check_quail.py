import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_quail():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, name, business_id FROM products WHERE name LIKE '%Quail%'")).fetchall()
        print("Quail Products:", res)

if __name__ == "__main__":
    check_quail()
