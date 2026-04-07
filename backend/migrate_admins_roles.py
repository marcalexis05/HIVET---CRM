import os
import sys
from sqlalchemy import create_engine, Column, Integer, String, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

# Load env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("Starting Admin roles migration...")

try:
    # Check if admin_users exists
    result = db.execute(text("SELECT * FROM information_schema.tables WHERE table_name='admin_users'"))
    if not result.fetchone():
        print("Table 'admin_users' does not exist. Migration might have already run.")
        sys.exit(0)

    # Make sure new tables exist
    from main import Base, engine as main_engine
    Base.metadata.create_all(bind=main_engine)

    # Fetch existing admins
    old_admins = db.execute(text("SELECT id, email, password_hash, name, first_name, last_name, role, created_at FROM admin_users")).fetchall()

    for admin in old_admins:
        email = admin[1]
        
        # Super admin
        if email == "admin@hivet.com":
            db.execute(
                text("""
                    INSERT INTO super_admin_users (email, password_hash, name, first_name, last_name, role, created_at)
                    VALUES (:email, :pwd, :name, :first, :last, 'super_admin', :created)
                """),
                {
                    "email": email,
                    "pwd": admin[2],
                    "name": admin[3],
                    "first": admin[4],
                    "last": admin[5],
                    "created": admin[7]
                }
            )
            print(f"Migrated {email} to super_admin_users")
        
        # System admin
        elif email == "systemadmin@hivet.com":
            db.execute(
                text("""
                    INSERT INTO system_admin_users (email, password_hash, name, first_name, last_name, role, created_at)
                    VALUES (:email, :pwd, :name, :first, :last, 'system_admin', :created)
                """),
                {
                    "email": email,
                    "pwd": admin[2],
                    "name": admin[3],
                    "first": admin[4],
                    "last": admin[5],
                    "created": admin[7]
                }
            )
            print(f"Migrated {email} to system_admin_users")
        else:
            print(f"Unknown admin email {email}, keeping as super_admin for safety.")
            db.execute(
                text("""
                    INSERT INTO super_admin_users (email, password_hash, name, first_name, last_name, role, created_at)
                    VALUES (:email, :pwd, :name, :first, :last, 'super_admin', :created)
                """),
                {
                    "email": email,
                    "pwd": admin[2],
                    "name": admin[3],
                    "first": admin[4],
                    "last": admin[5],
                    "created": admin[7]
                }
            )

    db.commit()

    # Drop old table
    db.execute(text("DROP TABLE admin_users CASCADE"))
    db.commit()
    print("Migration complete. Dropped 'admin_users' table.")

except Exception as e:
    db.rollback()
    print(f"Migration failed: {e}")
finally:
    db.close()
