import psycopg2
import os

# Database connection details (from main.py - we'll try common local postgres settings if not specified, 
# but usually it's in the .env or hardcoded. Let's look at main.py first to be sure.)

def add_column():
    try:
        # Based on logs, it's Postgres (psycopg2)
        # We'll try to get connection string from environment if possible, 
        # but let's just use the logic from main.py's engine if we can.
        
        # Actually, let's just use SQLAlchemy since main.py already has it.
        from sqlalchemy import text
        from sqlalchemy import create_engine
        
        # Hardcoding the common dev DB URL for this project if possible, 
        # or better, just read it from main.py
        
        DATABASE_URL = "postgresql://postgres:0428@localhost:5432/hivet"
        engine = create_engine(DATABASE_URL)
        
        with engine.begin() as conn:
            print("Checking if branch_id exists in reservations...")
            # We already know it doesn't from the error, but let's be safe.
            try:
                conn.execute(text("ALTER TABLE reservations ADD COLUMN branch_id INTEGER"))
                print("Column branch_id successfully added to reservations table.")
            except Exception as e:
                print(f"Error adding column (maybe it already exists?): {e}")

    except Exception as e:
        print(f"Failed to connect or update: {e}")

if __name__ == "__main__":
    add_column()
