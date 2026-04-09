import sys
import os

# Add the current directory to path so we can import from backend
sys.path.append(os.path.abspath("backend"))

from main import SessionLocal, BusinessProfile, BusinessBranch, Order, Reservation

def find_tierra_nova():
    db = SessionLocal()
    try:
        print("Searching for 'Tierra Nova' in branches...")
        branches = db.query(BusinessBranch).filter(
            (BusinessBranch.address_line1.ilike("%Tierra Nova%")) |
            (BusinessBranch.street.ilike("%Tierra Nova%")) |
            (BusinessBranch.subdivision.ilike("%Tierra Nova%"))
        ).all()
        for b in branches:
            print(f"Branch ID: {b.id}, Business ID: {b.business_id}, Name: {b.name}, Address: {b.address_line1}, Granular: {b.street}")

        print("\nSearching for 'Tierra Nova' in profiles...")
        profiles = db.query(BusinessProfile).filter(
            (BusinessProfile.clinic_street.ilike("%Tierra Nova%")) |
            (BusinessProfile.clinic_subdivision.ilike("%Tierra Nova%"))
        ).all()
        for p in profiles:
            print(f"Profile ID: {p.id}, Clinic: {p.clinic_name}, Address: {p.clinic_street}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    find_tierra_nova()
