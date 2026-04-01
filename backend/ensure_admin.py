import psycopg2
from passlib.hash import pbkdf2_sha256
import datetime

DATABASE_URL = "postgresql://postgres:tabios13@localhost:5432/hivet"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    email = "admin@hivet.com"
    password = "admin123"
    role = "admin"
    name = "Super Admin"
    pwd_hash = pbkdf2_sha256.hash(password)
    
    # Check if user exists
    cur.execute("SELECT id FROM customer WHERE email = %s", (email,))
    existing = cur.fetchone()
    
    if existing:
        cur.execute(
            "UPDATE customer SET role = %s, password_hash = %s, name = %s WHERE email = %s",
            (role, pwd_hash, name, email)
        )
        print(f"Updated existing user: {email}")
    else:
        cur.execute(
            "INSERT INTO customer (email, password_hash, role, name, created_at) VALUES (%s, %s, %s, %s, %s)",
            (email, pwd_hash, role, name, datetime.datetime.utcnow())
        )
        print(f"Created new user: {email}")
        
    conn.commit()
    conn.close()
    print("Database operation successful.")
except Exception as e:
    print(f"Error: {e}")
