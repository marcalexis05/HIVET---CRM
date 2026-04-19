import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.begin() as conn:
    # 1. Find the admin user in customer table
    admin = conn.execute(text("SELECT * FROM customer WHERE role = 'admin'")).fetchone()
    
    if admin:
        print(f"Found admin in customer table: {admin.email}")
        
        # 2. Check if they already exist in super_admin_users
        exists = conn.execute(text("SELECT id FROM super_admin_users WHERE email = :email"), {"email": admin.email}).fetchone()
        
        if not exists:
            # 3. Insert into super_admin_users
            conn.execute(text("""
                INSERT INTO super_admin_users (email, password_hash, name, first_name, last_name, role, created_at)
                VALUES (:email, :pwd, :name, :first, :last, 'super_admin', :created)
            """), {
                "email": admin.email,
                "pwd": admin.password_hash,
                "name": admin.name,
                "first": admin.first_name,
                "last": admin.last_name,
                "created": admin.created_at
            })
            print(f"✅ Migrated {admin.email} to super_admin_users.")
            
            # 4. Remove from customer table to avoid confusion in login logic
            conn.execute(text("DELETE FROM customer WHERE id = :id"), {"id": admin.id})
            print(f"✅ Removed {admin.email} from customer table.")
        else:
            print(f"User {admin.email} already exists in super_admin_users.")
            # Remove from customer anyway if they're already in super_admin
            conn.execute(text("DELETE FROM customer WHERE id = :id"), {"id": admin.id})
            print(f"✅ Cleaned up duplicate in customer table.")
    else:
        print("No admin found in customer table.")
