import sys
import os

# Add the current directory to path so we can import from backend
sys.path.append(os.path.abspath("backend"))

from main import SessionLocal, BusinessProfile, BusinessBranch

def analyze_alpha_clinic():
    db = SessionLocal()
    try:
        # Search for Alpha Veterinary Clinic
        biz = db.query(BusinessProfile).filter(BusinessProfile.clinic_name.ilike("%Alpha Veterinary%")).first()
        if not biz:
            print("Alpha Veterinary Clinic not found.")
            return

        print(f"--- Business Profile (ID: {biz.id}) ---")
        print(f"Clinic Name: {biz.clinic_name}")
        print(f"Profile Address: {biz.clinic_house_number} {biz.clinic_street}, {biz.clinic_barangay}, {biz.clinic_city}")
        
        print("\n--- Business Branches ---")
        branches = db.query(BusinessBranch).filter(BusinessBranch.business_id == biz.id).all()
        for b in branches:
            print(f"ID: {b[0] if isinstance(b, tuple) else b.id}")
            print(f"  Name: {b.name}")
            print(f"  Is Main: {b.is_main}")
            print(f"  Address Line 1: {b.address_line1}")
            print(f"  Granular Address: {b.house_number} {b.street}, {b.barangay}, {b.city}")
            print("-" * 20)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    analyze_alpha_clinic()
