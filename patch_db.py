from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Assuming this is your database URL
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:0428@localhost:5432/hivet"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def patch_order_76():
    db = SessionLocal()
    try:
        # Check Business Profiles
        profiles = db.execute(text("SELECT id, clinic_name, clinic_lat, clinic_lng FROM business_profiles LIMIT 5;"))
        print("Business Profiles:")
        clinic_id = None
        for p in profiles:
            print(p)
            clinic_id = p[0]
            
        if clinic_id:
            # Patch the order table directly using raw sql for simplicity
            result = db.execute(text(f"UPDATE orders SET clinic_id = {clinic_id} WHERE id = 76 RETURNING id, clinic_id, branch_id;"))
            db.commit()
            print(f"Patched row: {result.fetchone()}")
            
    finally:
        db.close()

if __name__ == "__main__":
    patch_order_76()
