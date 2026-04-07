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
        
        print(f"Checking database...")
        
        print("\n--- Rider Profiles ---")
        rider_cols = [c['name'] for c in inspector.get_columns("rider_profiles")]
        all_rider_ok = True
        for col in ["home_house_number", "home_lat", "home_lng", "home_barangay", "home_city", "home_province"]:
            if col in rider_cols:
                print(f"[OK] {col}")
            else:
                print(f"[MISSING] {col}")
                all_rider_ok = False
                
        print("\n--- Business Profiles ---")
        biz_cols = [c['name'] for c in inspector.get_columns("business_profiles")]
        all_biz_ok = True
        for col in ["owner_first_name", "owner_last_name", "clinic_lat", "clinic_lng"]:
            if col in biz_cols:
                print(f"[OK] {col}")
            else:
                print(f"[MISSING] {col}")
                all_biz_ok = False
        
        if all_rider_ok and all_biz_ok:
            print("\nVerification SUCCESS: All fields are present.")
        else:
            print("\nVerification FAILED: Some fields are missing.")
                
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    check_schema()
