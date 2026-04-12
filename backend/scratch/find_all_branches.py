from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

def find_all_branches():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found.")
        return

    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # Find all Business Profiles
            query = text("SELECT id, clinic_name FROM business_profiles WHERE is_deleted = false")
            result = conn.execute(query)
            profiles = result.fetchall()
            
            if not profiles:
                print("No clinics found in the database.")
                return

            for pid, p_name in profiles:
                print(f"\nHealthcare Provider: {p_name or 'Unnamed Clinic'} (ID: {pid})")
                
                # Find Branches
                branch_query = text("SELECT name, address_line1, address_line2, city, barangay, province FROM business_branches WHERE business_id = :pid")
                branches = conn.execute(branch_query, {"pid": pid}).fetchall()
                
                if not branches:
                    print("  No active branches found.")
                else:
                    for b_name, addr1, addr2, city, barangay, prov in branches:
                        full_addr = f"{addr1 or ''} {addr2 or ''} {barangay or ''} {city or ''} {prov or ''}".strip()
                        print(f"  - Branch: {b_name}")
                        print(f"    Address: {full_addr}")
    except Exception as e:
        print(f"Error querying database: {e}")

if __name__ == '__main__':
    find_all_branches()
