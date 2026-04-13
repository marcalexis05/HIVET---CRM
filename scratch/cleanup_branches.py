import sys
import os

# Add the current directory to path so we can import from backend
sys.path.append(os.path.abspath("backend"))

from main import SessionLocal, BusinessProfile, BusinessBranch

def cleanup_branch_names():
    db = SessionLocal()
    try:
        # Find all branches where the name is the same as the clinic name or default generic labels
        branches = db.query(BusinessBranch).all()
        print(f"Analyzing {len(branches)} branches for smart naming...")

        for b in branches:
            biz = db.query(BusinessProfile).filter(BusinessProfile.id == b.business_id).first()
            if not biz: continue

            # If branch name is same as clinic name or empty
            if not b.name or b.name == biz.clinic_name or b.name == "Branch":
                if b.is_main:
                    b.name = "Main Branch"
                else:
                    # Try to use Street or Barangay for the name
                    location_name = b.street or b.barangay or b.city or f"Branch #{b.id}"
                    # Remove "Barangay" prefix if present for brevity in the name
                    location_name = location_name.replace("Barangay ", "").replace("BARANGAY ", "")
                    b.name = f"{location_name} Branch"
                
                print(f"  -> Renamed branch {b.id} of {biz.clinic_name} to: {b.name}")

        db.commit()
        print("Branch naming cleanup completed successfully.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_branch_names()
