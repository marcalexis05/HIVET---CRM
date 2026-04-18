import sqlite3
import os

db_path = 'hivet.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

print("Tables:")
c.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = c.fetchall()
for t in tables:
    print(f" - {t[0]}")
    c.execute(f"PRAGMA table_info({t[0]})")
    cols = c.fetchall()
    for col in cols:
        print(f"   {col[1]} ({col[2]})")

conn.close()
