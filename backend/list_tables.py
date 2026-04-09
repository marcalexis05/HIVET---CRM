import sqlite3
import os

db_path = r"c:\Apache24\htdocs\HIVET - CRM\backend\hivet.db"

def list_tables():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])
    conn.close()

if __name__ == "__main__":
    list_tables()
