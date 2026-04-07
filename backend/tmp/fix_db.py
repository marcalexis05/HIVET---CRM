import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Adding loyalty_points_per_peso to business_profiles...")
    try:
        conn.execute(text("ALTER TABLE business_profiles ADD COLUMN loyalty_points_per_peso FLOAT DEFAULT 10.0"))
        conn.commit()
        print("Successfully added loyalty_points_per_peso")
    except Exception as e:
        print(f"Error adding loyalty_points_per_peso: {e}")
        conn.rollback()

    print("Adding loyalty_points_per_reservation to business_profiles...")
    try:
        conn.execute(text("ALTER TABLE business_profiles ADD COLUMN loyalty_points_per_reservation INTEGER DEFAULT 50"))
        conn.commit()
        print("Successfully added loyalty_points_per_reservation")
    except Exception as e:
        print(f"Error adding loyalty_points_per_reservation: {e}")
        conn.rollback()

print("Database fix complete.")
