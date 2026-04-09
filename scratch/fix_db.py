import sys
import os

# Add the current directory to path so we can import from backend
sys.path.append(os.path.abspath("backend"))

from main import SessionLocal, BusinessProfile, BusinessBranch, Customer, Order, Reservation
from sqlalchemy import func

def fix_branch_locations():
    db = SessionLocal()
    try:
        # 1. Sync all Main Branches and create if missing
        businesses = db.query(BusinessProfile).all()
        print(f"Analyzing {len(businesses)} business profiles...")

        for biz in businesses:
            main_branch = db.query(BusinessBranch).filter(
                BusinessBranch.business_id == biz.id,
                BusinessBranch.is_main == True
            ).first()

            # Construct legacy address lines from granular profile fields
            line1 = " ".join(filter(None, [biz.clinic_house_number, biz.clinic_block_number, biz.clinic_street, biz.clinic_subdivision])) or "Address Not Set"
            line2 = ", ".join(filter(None, [biz.clinic_barangay, biz.clinic_city, biz.clinic_province])) or "Address Not Set"

            if not main_branch:
                print(f"Fixing missing Main Branch for: {biz.clinic_name} (ID: {biz.id})")
                new_branch = BusinessBranch(
                    business_id=biz.id,
                    name="Main Branch",
                    phone=biz.clinic_phone or biz.owner_phone or "09000000000",
                    address_line1=line1,
                    address_line2=line2,
                    house_number=biz.clinic_house_number,
                    block_number=biz.clinic_block_number,
                    street=biz.clinic_street,
                    subdivision=biz.clinic_subdivision,
                    sitio=biz.clinic_sitio,
                    barangay=biz.clinic_barangay,
                    city=biz.clinic_city,
                    district=biz.clinic_district,
                    province=biz.clinic_province,
                    zip_code=biz.clinic_zip,
                    region=biz.clinic_region,
                    lat=biz.clinic_lat,
                    lng=biz.clinic_lng,
                    is_main=True
                )
                db.add(new_branch)
            else:
                # Update existing main branch from profile if it's sparse
                main_branch.barangay = main_branch.barangay or biz.clinic_barangay
                main_branch.city = main_branch.city or biz.clinic_city
                main_branch.province = main_branch.province or biz.clinic_province
                main_branch.street = main_branch.street or biz.clinic_street
                main_branch.house_number = main_branch.house_number or biz.clinic_house_number
                main_branch.address_line1 = main_branch.address_line1 or line1
                main_branch.address_line2 = main_branch.address_line2 or line2
                main_branch.lat = main_branch.lat or biz.clinic_lat
                main_branch.lng = main_branch.lng or biz.clinic_lng

        # 2. Cleanup ALL branches (ensure all branches have valid legacy address lines)
        all_branches = db.query(BusinessBranch).all()
        print(f"Checking {len(all_branches)} total branch records...")
        for b in all_branches:
            if not b.name:
                b.name = "Main Branch" if b.is_main else "Branch"
            
            # Ensure address_line1 is not null to satisfy constraint
            if not b.address_line1:
                derived_line1 = " ".join(filter(None, [b.house_number, b.block_number, b.street, b.subdivision]))
                b.address_line1 = derived_line1 or "Address Line 1"
            if not b.address_line2:
                derived_line2 = ", ".join(filter(None, [b.barangay, b.city, b.province]))
                b.address_line2 = derived_line2 or "Address Line 2"

        db.commit()
        print("Database migration and address fix completed successfully.")

    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_branch_locations()
