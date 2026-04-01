import psycopg2

DATABASE_URL = "postgresql://postgres:tabios13@localhost:5432/hivet"

def migrate():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 1. Add role column to customer table
        cur.execute("""
            ALTER TABLE customer 
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
        """)
        print("Added 'role' column to 'customer' table.")
        
        # 2. Create rider_profiles table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rider_profiles (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER UNIQUE NOT NULL,
                vehicle_type VARCHAR(100),
                license_number VARCHAR(100),
                is_online BOOLEAN DEFAULT FALSE,
                total_earnings INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
            );
        """)
        print("Created 'rider_profiles' table.")
        
        conn.commit()
        cur.close()
        conn.close()
        print("Migration completed successfully.")
    except Exception as e:
        print("Migration failed:", e)

if __name__ == "__main__":
    migrate()
