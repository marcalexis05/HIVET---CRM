import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_res_columns():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM reservations LIMIT 0"))
        print("Reservations columns:", res.keys())

if __name__ == "__main__":
    check_res_columns()
