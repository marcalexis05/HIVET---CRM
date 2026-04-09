from main import engine, text
import sqlalchemy

def migrate():
    tables = ['customer', 'rider_profiles', 'business_profiles', 'super_admin_users', 'system_admin_users']
    with engine.connect() as conn:
        for t in tables:
            try:
                # Use plain TIMESTAMP for PostgreSQL/SQLite compatibility
                conn.execute(text(f"ALTER TABLE {t} ADD COLUMN last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                print(f"SUCCESS: Added 'last_active' column to {t}")
            except Exception as e:
                # If column already exists (psycopg2.errors.DuplicateColumn), we ignore
                if "already exists" in str(e).lower():
                    print(f"INFO: Column 'last_active' already exists in {t}")
                else:
                    print(f"ERROR updating {t}: {e}")
        conn.commit()
    print("Migration execution complete.")

if __name__ == "__main__":
    migrate()
