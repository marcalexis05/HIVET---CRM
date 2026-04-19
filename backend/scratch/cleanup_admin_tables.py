import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.begin() as conn:
    # 1. Check for 'admin' role in customer table
    rows = conn.execute(text("SELECT id, email FROM customer WHERE role = 'admin'")).fetchall()
    
    for row in rows:
        print(f"Cleaning up admin user: {row.email}")
        
        # Check if they exist in super_admin_users
        exists = conn.execute(text("SELECT id FROM super_admin_users WHERE email = :email"), {"email": row.email}).fetchone()
        
        if not exists:
            # If they don't exist, we should move them there.
            # But let's check system_admin_users too.
            exists_sys = conn.execute(text("SELECT id FROM system_admin_users WHERE email = :email"), {"email": row.email}).fetchone()
            
            if not exists_sys:
                print(f"Moving {row.email} to super_admin_users table...")
                admin_data = conn.execute(text("SELECT * FROM customer WHERE id = :id"), {"id": row.id}).fetchone()
                conn.execute(text("""
                    INSERT INTO super_admin_users (email, password_hash, name, first_name, last_name, role, created_at)
                    VALUES (:email, :pwd, :name, :first, :last, 'super_admin', :created)
                """), {
                    "email": admin_data.email,
                    "pwd": admin_data.password_hash,
                    "name": admin_data.name,
                    "first": admin_data.first_name,
                    "last": admin_data.last_name,
                    "created": admin_data.created_at
                })
        
        # Finally delete from customer table
        conn.execute(text("DELETE FROM customer WHERE id = :id"), {"id": row.id})
        print(f"Done cleaning {row.email}")

print("Platform health check complete.")
