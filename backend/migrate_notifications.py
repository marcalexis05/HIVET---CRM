import psycopg2

DB_URL = "postgresql://postgres:0428@localhost:5432/hivet"

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# Add to customer table
cur.execute("ALTER TABLE customer ADD COLUMN IF NOT EXISTS notif_order_updates BOOLEAN DEFAULT TRUE")
cur.execute("ALTER TABLE customer ADD COLUMN IF NOT EXISTS notif_loyalty_alerts BOOLEAN DEFAULT TRUE")
cur.execute("ALTER TABLE customer ADD COLUMN IF NOT EXISTS notif_promotions BOOLEAN DEFAULT FALSE")
cur.execute("ALTER TABLE customer ADD COLUMN IF NOT EXISTS notif_gmail BOOLEAN DEFAULT FALSE")

# Add to business_profiles table
cur.execute("ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS notif_order_updates BOOLEAN DEFAULT TRUE")
cur.execute("ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS notif_loyalty_alerts BOOLEAN DEFAULT TRUE")
cur.execute("ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS notif_newsletter BOOLEAN DEFAULT FALSE")
cur.execute("ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS notif_gmail BOOLEAN DEFAULT FALSE")

# Add to rider_profiles table
cur.execute("ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS notif_order_updates BOOLEAN DEFAULT TRUE")
cur.execute("ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS notif_loyalty_alerts BOOLEAN DEFAULT TRUE")
cur.execute("ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS notif_newsletter BOOLEAN DEFAULT FALSE")
cur.execute("ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS notif_gmail BOOLEAN DEFAULT FALSE")

conn.commit()
cur.close()
conn.close()

print("Migration completed successfully!")