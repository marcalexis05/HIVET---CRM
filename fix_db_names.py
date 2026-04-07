from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///backend/database.db")

with engine.begin() as conn:
    print("Updating business profiles...")
    conn.execute(text("UPDATE business_profiles SET clinic_name = REPLACE(clinic_name, 'Happy Paws', 'Hi-Vet') WHERE clinic_name LIKE '%Happy Paws%'"))
    
    print("Updating business branches...")
    conn.execute(text("UPDATE business_branches SET name = REPLACE(name, 'Happy Paws', 'Hi-Vet') WHERE name LIKE '%Happy Paws%'"))
    
    # Also update products or orders just in case
    print("Updating products...")
    conn.execute(text("UPDATE products SET name = REPLACE(name, 'Happy Paws', 'Hi-Vet') WHERE name LIKE '%Happy Paws%'"))
    conn.execute(text("UPDATE prodotti SET name = REPLACE(name, 'Happy Paws', 'Hi-Vet') WHERE name LIKE '%Happy Paws%'")) # just in case of any other tables
    
    print("Database terminology updated from 'Happy Paws' to 'Hi-Vet' successfully.")
