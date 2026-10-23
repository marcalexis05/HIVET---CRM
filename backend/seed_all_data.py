import os
from datetime import datetime
from dotenv import load_dotenv
from passlib.hash import pbkdf2_sha256
import psycopg2

load_dotenv('backend/.env')
db_url = os.getenv('DATABASE_URL', '')
if db_url.startswith('postgresql+psycopg2://'):
    db_url = db_url.replace('postgresql+psycopg2://', 'postgresql://')

conn = psycopg2.connect(db_url)
cur = conn.cursor()

print("Seeding Supabase database...")

# 1. Super Admin
admin_hash = pbkdf2_sha256.hash("system123")
cur.execute("""
    INSERT INTO super_admin_users (email, password_hash, name, first_name, last_name, role, created_at)
    VALUES ('systemadmin@hivet.com', %s, 'System Administrator', 'System', 'Administrator', 'super_admin', NOW())
    ON CONFLICT (id) DO NOTHING;
""", (admin_hash,))
print("[OK] Super Admin seeded (systemadmin@hivet.com / system123)")

# 2. Business Profile (Clinic)
clinic_hash = pbkdf2_sha256.hash("clinic123")
cur.execute("""
    INSERT INTO business_profiles (
        id, email, password_hash, role, clinic_name, clinic_phone, owner_full_name,
        compliance_status, clinic_city, clinic_province, clinic_lat, clinic_lng,
        loyalty_points_per_peso, loyalty_points_per_reservation, created_at
    )
    VALUES (
        1, 'business@hivet.com', %s, 'business', 'Hi-Vet Central Animal Clinic & Hospital',
        '09171234567', 'Dr. Alexis Marc', 'compliant', 'Quezon City', 'Metro Manila',
        14.7356, 121.0428, 0.05, 50, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        clinic_name = EXCLUDED.clinic_name,
        compliance_status = 'compliant';
""", (clinic_hash,))
print("[OK] Business Clinic seeded (business@hivet.com / clinic123)")

# 3. Main Branch
cur.execute("""
    INSERT INTO business_branches (
        id, business_id, name, phone, address_line1, address_line2, city, province, lat, lng, is_main, created_at
    )
    VALUES (
        1, 1, 'Hi-Vet Main Hospital Branch', '09171234567', 'Block 12 Lot 4, Commonwealth Ave',
        'Batasan Hills', 'Quezon City', 'Metro Manila', 14.7356, 121.0428, TRUE, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET is_main = TRUE;
""")
print("[OK] Main Branch seeded")

# 4. Operating Hours
cur.execute("DELETE FROM business_operating_hours WHERE business_id = 1;")
for day in range(7):
    is_open = day != 0 # Sunday closed
    cur.execute("""
        INSERT INTO business_operating_hours (business_id, day_of_week, is_open, open_time, close_time)
        VALUES (1, %s, %s, '09:00', '18:00');
    """, (day, is_open))
print("[OK] Operating hours seeded (Mon-Sat 9AM-6PM)")

# 5. Business Services
services = [
    ("General Veterinary Consultation", "Complete health checkup and physical examination for dogs and cats.", 450.00, 30, 20),
    ("Core Vaccination (5-in-1 / 4-in-1)", "Preventive immunization against common infectious diseases.", 650.00, 20, 30),
    ("Rabies Vaccination", "Essential annual rabies vaccine with official certification.", 250.00, 15, 15),
    ("Full Grooming Package", "Bath, blow dry, ear cleaning, nail trim, sanitary cut, and styling.", 800.00, 60, 40),
    ("Dental Scaling & Cleaning", "Ultrasonic dental cleaning and plaque removal under light sedation.", 1800.00, 45, 60),
    ("Spay / Neuter Surgery", "Safe elective sterilisation procedure with post-operative monitoring.", 2500.00, 90, 100),
]
cur.execute("DELETE FROM business_services WHERE business_id = 1;")
for name, desc, price, dur, pts in services:
    cur.execute("""
        INSERT INTO business_services (business_id, name, description, price, duration_minutes, is_active, loyalty_points, created_at)
        VALUES (1, %s, %s, %s, %s, TRUE, %s, NOW());
    """, (name, desc, price, dur, pts))
print("[OK] Business services seeded (6 services)")

# 6. Products & Branch Inventory
products = [
    ("Grain-Free Alpine Salmon (Dog Food 2kg)", "Wild-caught salmon with mountain herbs for optimal canine digestion.", 850.00, "Dogs", "Food", "/images/food_dog_salmon.png", "Organic", 5.0, 50),
    ("Raw Vitality Rabbit Feast (Cat Food 1.5kg)", "Pure freeze-dried rabbit meat providing essential taurine.", 640.00, "Cats", "Food", "/images/food_cat_rabbit.png", "Raw-Diet", 5.0, 45),
    ("Puppy Growth Formula (3kg)", "DHA-enriched kibble supporting brain development and bone growth.", 550.00, "Dogs", "Food", "/images/food_dog_puppy.png", "Grain-Free", 4.8, 60),
    ("Indoor Weight Control (Cat Food 2kg)", "L-carnitine formula to maintain healthy weight in indoor cats.", 480.00, "Cats", "Food", "/images/food_cat_indoor.png", "Diet", 4.7, 40),
    ("Senior Mobility Beef Chunks (Dog Food)", "Soft textured chunks with glucosamine for aging joints.", 720.00, "Dogs", "Food", "/images/food_dog_senior.png", "Senior", 4.9, 30),
    ("Multivitamin & Immune Support Chews", "Daily chewable vitamins packed with Omega-3 and antioxidants.", 380.00, "Dogs", "Vitamins", "/images/product_dog_vitamins.png", "Supplements", 5.0, 80),
    ("Urinary Tract Health Drops for Cats", "Natural cranberry and D-mannose blend for feline urinary tract.", 350.00, "Cats", "Vitamins", "/images/vit_cat_urinary.png", "Care", 4.8, 50),
    ("Hypoallergenic Oatmeal Pet Shampoo (500ml)", "Gentle soothing aloe and colloidal oatmeal coat wash.", 320.00, "All", "Care", "/images/product_shampoo.png", "Grooming", 4.9, 70),
    ("Reflective Outdoor Harness (Medium)", "Breathable nylon harness with reinforced safety buckles.", 450.00, "Dogs", "Accessories", "/images/product_dog_harness.png", "Gear", 4.6, 25),
]
cur.execute("DELETE FROM branch_inventory WHERE branch_id = 1;")
cur.execute("DELETE FROM products WHERE business_id = 1;")
for name, desc, price, cat, p_type, img, tag, stars, stock in products:
    cur.execute("""
        INSERT INTO products (business_id, name, description, price, stock, category, type, image, tag, stars, loyalty_points, created_at)
        VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING id;
    """, (name, desc, price, stock, cat, p_type, img, tag, stars, int(price * 0.05)))
    p_id = cur.fetchone()[0]
    cur.execute("""
        INSERT INTO branch_inventory (product_id, branch_id, stock, created_at)
        VALUES (%s, 1, %s, NOW());
    """, (p_id, stock))
print("[OK] Products & inventory seeded (9 catalog products)")

# 7. Loyalty Vouchers
vouchers = [
    ("₱50 Off Consultation", 50, "discount", 50.0),
    ("₱100 Off Any Service", 100, "discount", 100.0),
    ("Free Pet Grooming Add-On", 150, "free_item", 150.0),
    ("₱200 Off Veterinary Care", 200, "discount", 200.0),
]
cur.execute("DELETE FROM loyalty_vouchers;")
for title, cost, v_type, val in vouchers:
    cur.execute("""
        INSERT INTO loyalty_vouchers (title, cost, type, value, is_active, created_at)
        VALUES (%s, %s, %s, %s, TRUE, NOW());
    """, (title, cost, v_type, val))
print("[OK] Loyalty vouchers seeded (4 vouchers)")

# 8. Rider Profile
rider_hash = pbkdf2_sha256.hash("rider123")
cur.execute("""
    INSERT INTO rider_profiles (
        email, password_hash, first_name, last_name, name, phone, role,
        vehicle_type, license_number, compliance_status, is_online, created_at
    )
    VALUES (
        'rider@hivet.com', %s, 'Juan', 'Dela Cruz', 'Juan Dela Cruz', '09189876543', 'rider',
        'Motorcycle', 'N01-23-456789', 'compliant', TRUE, NOW()
    )
    ON CONFLICT (id) DO NOTHING;
""", (rider_hash,))
print("[OK] Rider profile seeded (rider@hivet.com / rider123)")

conn.commit()
conn.close()
print("All tables successfully seeded in Supabase PostgreSQL!")
