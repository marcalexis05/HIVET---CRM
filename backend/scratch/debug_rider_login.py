import psycopg2
from passlib.hash import pbkdf2_sha256

DATABASE_URL = "postgresql://postgres:0428@localhost:5432/hivet"

TARGET_EMAIL = "iamsenvaljavvezm@gmail.com"
TARGET_PWD = "Marcalexis_05"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    print(f"--- Checking for {TARGET_EMAIL} ---")
    
    # 1. Check rider_profiles
    cur.execute("SELECT id, email, role, compliance_status, password_hash FROM rider_profiles WHERE email=%s", (TARGET_EMAIL,))
    rider = cur.fetchone()
    if rider:
        rid, email, role, status, pwd_hash = rider
        print(f"[RiderProfile] Found: ID={rid}, Role={role}, Status={status}")
        if pwd_hash:
            is_valid = pbkdf2_sha256.verify(TARGET_PWD, pwd_hash)
            print(f"  Password match: {is_valid}")
        else:
            print("  No password hash in rider_profiles!")
    else:
        print("[RiderProfile] NOT found")
        
    # 2. Check customer
    cur.execute("SELECT id, email, role, password_hash FROM customer WHERE email=%s", (TARGET_EMAIL,))
    cust = cur.fetchone()
    if cust:
        cid, email, role, pwd_hash = cust
        print(f"[Customer] Found: ID={cid}, Role={role}")
        if pwd_hash:
            is_valid = pbkdf2_sha256.verify(TARGET_PWD, pwd_hash)
            print(f"  Password match: {is_valid}")
        else:
            print("  No password hash in customer table!")
    else:
        print("[Customer] NOT found")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
