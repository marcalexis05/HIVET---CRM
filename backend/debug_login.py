import psycopg2
from passlib.hash import pbkdf2_sha256

DATABASE_URL = "postgresql://postgres:tabios13@localhost:5432/hivet"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check if user exists
    cur.execute("SELECT email, role, password_hash FROM customer WHERE email='admin@hivet.com'")
    result = cur.fetchone()
    
    if result:
        email, role, pwd_hash = result
        print(f"User found: {email}, Role: {role}")
        print(f"Has password hash: {pwd_hash is not None}")
        
        # Verify password manually
        is_valid = pbkdf2_sha256.verify('admin123', pwd_hash)
        print(f"Password 'admin123' valid: {is_valid}")
    else:
        print("User admin@hivet.com NOT found")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
