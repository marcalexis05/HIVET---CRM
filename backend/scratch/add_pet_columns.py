import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.begin() as conn:
    print("Adding pet_type and pet_breed to reservations...")
    try:
        conn.execute(text("ALTER TABLE reservations ADD COLUMN pet_type VARCHAR DEFAULT 'Dog'"))
        print(" - Added pet_type")
    except Exception as e:
        print(f" - Error adding pet_type: {e}")
        
    try:
        conn.execute(text("ALTER TABLE reservations ADD COLUMN pet_breed VARCHAR NULL"))
        print(" - Added pet_breed")
    except Exception as e:
        print(f" - Error adding pet_breed: {e}")

print("Done.")
