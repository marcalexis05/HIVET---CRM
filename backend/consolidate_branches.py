import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env vars
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def consolidate_to_main():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        try:
            # 1. Find the main branch ID for each business
            res = conn.execute(text("SELECT id, name, business_id FROM business_branches WHERE is_main = True")).fetchall()
            
            if not res:
                print("No main branches found.")
                return

            for branch_id, branch_name, biz_id in res:
                print(f"Consolidating data for Business {biz_id} to Branch {branch_id} ({branch_name})...")
                
                # Update orders: Set both branch_id AND clinic_id to be safe
                # This ensures any previously mis-assigned orders belong to the correct business AND main branch
                upd_orders = conn.execute(
                    text("UPDATE orders SET branch_id = :bid, clinic_id = :biz_id WHERE (branch_id IS NULL OR branch_id != :bid OR clinic_id IS NULL OR clinic_id != :biz_id) AND (clinic_id = :biz_id OR clinic_id IS NULL)"),
                    {"bid": branch_id, "biz_id": biz_id}
                )
                print(f"Updated {upd_orders.rowcount} orders for Business {biz_id}.")

                # Update reservations
                upd_res = conn.execute(
                    text("UPDATE reservations SET branch_id = :bid, business_id = :biz_id WHERE (branch_id IS NULL OR branch_id != :bid OR business_id IS NULL OR business_id != :biz_id) AND (business_id = :biz_id OR business_id IS NULL)"),
                    {"bid": branch_id, "biz_id": biz_id}
                )
                print(f"Updated {upd_res.rowcount} reservations for Business {biz_id}.")

            print("Consolidation complete.")

        except Exception as e:
            print(f"Error during consolidation: {e}")

if __name__ == "__main__":
    consolidate_to_main()
