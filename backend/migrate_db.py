from sqlalchemy import text
from main import engine

def migrate():
    columns_to_add = [
        ("customer", "loyalty_points", "INTEGER DEFAULT 0"),
        ("customer", "referral_code", "VARCHAR UNIQUE"),
        ("business_profiles", "google_id", "VARCHAR UNIQUE"),
        ("products", "loyalty_points", "INTEGER DEFAULT 0"),
        ("reservations", "service_id", "INTEGER"),
        ("business_services", "loyalty_points", "INTEGER DEFAULT 0")
    ]
    
    with engine.connect() as conn:
        for table, col, col_type in columns_to_add:
            try:
                print(f"Adding column {col} to {table}...")
                # PostgreSQL specific 'IF NOT EXISTS' for columns is not directly supported in ALTER TABLE 
                # but we can check existence or just wrap in try-except.
                # A safer way in Postgres:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}"))
                conn.commit()
                print(f"Successfully added {col} to {table}")
            except Exception as e:
                conn.rollback()
                if "already exists" in str(e):
                    print(f"Column {col} already exists in {table}")
                else:
                    print(f"Error adding {col} to {table}: {e}")

if __name__ == "__main__":
    migrate()
