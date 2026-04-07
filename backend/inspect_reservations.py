import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

columns = [c['name'] for c in inspector.get_columns('reservations')]
tables = ['business_profiles', 'business_operating_hours', 'business_special_date_hours', 'business_services', 'reservations', 'customer']
for table in tables:
    print(f"\n--- {table} ---")
    if inspector.has_table(table):
        columns = [c['name'] for c in inspector.get_columns(table)]
        for col in columns:
            print(f"COL: {col}")
    else:
        print("TABLE NOT FOUND")

