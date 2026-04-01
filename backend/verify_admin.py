import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    row = conn.execute(text("SELECT id, email, name, role, password_hash FROM customer WHERE email='systemadmin@hivet.com'")).fetchone()
    if row:
        print("ID:", row[0])
        print("Email:", row[1])
        print("Name:", row[2])
        print("Role:", row[3])
        print("Hash:", row[4][:30] + "...")
    else:
        print("NOT FOUND")
