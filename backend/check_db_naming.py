import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    print("--- BRANCHES ---")
    branches = conn.execute(text("SELECT id, name, barangay, city, address_line2 FROM business_branches WHERE business_id = 1")).fetchall()
    for b in branches:
        print(f"ID: {b.id}, Name: {b.name}, Brgy: {b.barangay}, City: {b.city}, Addr2: {b.address_line2}")
    
    print("\n--- PROFILE ---")
    profiles = conn.execute(text("SELECT clinic_name, clinic_barangay, clinic_city FROM business_profiles WHERE id = 1")).fetchall()
    for p in profiles:
        print(f"Name: {p.clinic_name}, Brgy: {p.clinic_barangay}, City: {p.clinic_city}")
