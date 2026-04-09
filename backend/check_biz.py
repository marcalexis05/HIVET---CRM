import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_biz_profiles():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, clinic_name FROM business_profiles")).fetchall()
        print("Business Profiles:", res)

if __name__ == "__main__":
    check_biz_profiles()
