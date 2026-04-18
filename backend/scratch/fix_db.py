
import sys
import os
from sqlalchemy import create_engine, text, inspect

# Assuming the connection string is in the env or main.py
# Since I don't have direct access to .env, I'll try to extract it from main.py or just use the common one.
# Looking at the project, it likely uses a standard DATABASE_URL.

def migrate():
    # Attempt to connect to the DB
    # We'll use the one from main.py if we can find it, or assume local postgres.
    db_url = "postgresql://postgres:0428@localhost:5432/hivet"
    
    # Try to find the actual URL in main.py
    try:
        with open("backend/main.py", "r") as f:
            content = f.read()
            import re
            match = re.search(r'create_engine\("([^"]+)"\)', content)
            if match:
                db_url = match.group(1)
    except:
        pass

    engine = create_engine(db_url)
    inspector = inspect(engine)
    
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    if "deliveries" in tables:
        cols = [c['name'] for c in inspector.get_columns("deliveries")]
        print(f"Columns in deliveries: {cols}")
        with engine.begin() as conn:
            for col, col_type in [
                ("order_id", "INTEGER"),
                ("clinic_id", "INTEGER"),
                ("rider_id", "INTEGER"),
                ("status", "VARCHAR"),
                ("pickup_pin", "VARCHAR"),
                ("customer_pin", "VARCHAR"),
                ("cod_amount", "FLOAT"),
                ("delivery_fee", "FLOAT"),
                ("proof_of_delivery_url", "VARCHAR"),
                ("signature_url", "VARCHAR"),
                ("failed_reason", "VARCHAR"),
                ("created_at", "TIMESTAMP"),
                ("updated_at", "TIMESTAMP")
            ]:
                if col not in cols:
                    print(f"Adding {col} to deliveries...")
                    conn.execute(text(f"ALTER TABLE deliveries ADD COLUMN {col} {col_type}"))
    
    if "orders" in tables:
        cols = [c['name'] for c in inspector.get_columns("orders")]
        print(f"Columns in orders: {cols}")
        with engine.begin() as conn:
            for col, col_type in [
                ("delivery_type", "VARCHAR"),
                ("shipping_fee", "FLOAT"),
                ("customer_lat", "FLOAT"),
                ("customer_lng", "FLOAT"),
                ("discount_amount", "INTEGER"),
                ("voucher_code", "VARCHAR"),
                ("fulfillment_method", "VARCHAR")
            ]:
                if col not in cols:
                    print(f"Adding {col} to orders...")
                    conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col} {col_type}"))

if __name__ == "__main__":
    migrate()
