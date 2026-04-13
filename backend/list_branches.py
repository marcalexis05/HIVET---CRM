import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def list_branches():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, name, is_main, business_id FROM business_branches")).fetchall()
        for r in res:
            print(f"ID: {r.id}, Name: {r.name}, Main: {r.is_main}, Business: {r.business_id}")

if __name__ == "__main__":
    list_branches()
