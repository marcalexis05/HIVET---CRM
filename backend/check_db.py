import os
import psycopg2

DATABASE_URL = "postgresql://postgres:0428@localhost:5432/hivet"
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT email, picture FROM customer WHERE email='marcevangelista85@gmail.com'")
    result = cur.fetchall()
    print("DB RESULT:", result)
except Exception as e:
    print("Error:", e)
