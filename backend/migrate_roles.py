import sqlite3
import os

db_path = 'database.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE customer SET role = 'customer' WHERE role = 'user'")
        conn.commit()
        print(f"Migration successful: {cursor.rowcount} users migrated to customers.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
