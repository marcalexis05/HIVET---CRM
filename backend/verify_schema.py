from sqlalchemy import text
from main import engine

def verify():
    with engine.connect() as conn:
        for table in ["customer", "business_profiles", "products"]:
            print(f"Schema for {table}:")
            res = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'"))
            cols = [r[0] for r in res]
            print(f"Columns: {cols}")
            if "loyalty_points" in cols:
                print("Confirmed: loyalty_points exists.")
            if "google_id" in cols:
                print("Confirmed: google_id exists.")

if __name__ == "__main__":
    verify()
