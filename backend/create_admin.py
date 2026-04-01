"""
One-time setup script: creates the system admin account in the database.
Run with: python create_admin.py
"""
import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from passlib.hash import pbkdf2_sha256

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

EMAIL    = "systemadmin@hivet.com"
PASSWORD = "system123"
NAME     = "System Administrator"
ROLE     = "admin"

pwd_hash = pbkdf2_sha256.hash(PASSWORD)
print(f"Password hash: {pwd_hash}")

with engine.begin() as conn:
    # Check if already exists
    existing = conn.execute(
        text("SELECT id FROM customer WHERE email = :email"),
        {"email": EMAIL}
    ).fetchone()

    if existing:
        # Update existing account
        conn.execute(
            text("""
                UPDATE customer
                SET password_hash = :pwd_hash,
                    role = :role,
                    name = :name,
                    first_name = 'System',
                    last_name = 'Administrator'
                WHERE email = :email
            """),
            {"pwd_hash": pwd_hash, "role": ROLE, "name": NAME, "email": EMAIL}
        )
        print(f"✅ Updated existing account: {EMAIL} (role={ROLE})")
    else:
        # Insert new account
        conn.execute(
            text("""
                INSERT INTO customer
                  (email, password_hash, name, first_name, last_name, role, created_at)
                VALUES
                  (:email, :pwd_hash, :name, 'System', 'Administrator', :role, :now)
            """),
            {
                "email": EMAIL,
                "pwd_hash": pwd_hash,
                "name": NAME,
                "role": ROLE,
                "now": datetime.utcnow(),
            }
        )
        print(f"✅ Created admin account: {EMAIL} (role={ROLE})")

print("Done. You can now log in at /login with these credentials.")
