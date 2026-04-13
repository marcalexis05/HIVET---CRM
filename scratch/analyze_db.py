import sqlite3
import os

db_path = "backend/database.db"

def analyze_clinics():
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("--- Clinic Profiles ---")
    cursor.execute("SELECT id, clinic_name, clinic_city, clinic_barangay FROM business_profiles")
    profiles = cursor.fetchall()
    for p in profiles:
        print(f"ID: {p[0]}, Name: {p[1]}, Address: {p[2]}, {p[3]}")

    print("\n--- Branch Records ---")
    cursor.execute("SELECT id, business_id, name, city, barangay, is_main FROM business_branches")
    branches = cursor.fetchall()
    for b in branches:
        print(f"ID: {b[0]}, BusinessID: {b[1]}, Name: {b[2]}, Address: {b[3]}, {b[4]}, IsMain: {b[5]}")

    conn.close()

if __name__ == "__main__":
    analyze_clinics()
