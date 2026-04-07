import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_schema():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        print(f"Checking database: {DATABASE_URL.split('@')[-1]}")
        
        print("\n--- Rider Profiles ---")
        rider_cols = [c['name'] for c in inspector.get_columns("rider_profiles")]
        for col in ["home_house_number", "home_lat", "home_lng", "home_barangay"]:
            if col in rider_cols:
                print(f"[OK] {col} found")
            else:
                print(f"[MISSING] {col}")
                
        print("\n--- Business Profiles ---")
        biz_cols = [c['name'] for c in inspector.get_columns("business_profiles")]
        for col in ["owner_first_name", "owner_last_name", "clinic_lat", "clinic_lng"]:
            if col in biz_cols:
                print(f"[OK] {col} found")
            else:
                print(f"[MISSING] {col}")
                
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    check_schema()
