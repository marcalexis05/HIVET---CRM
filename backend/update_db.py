from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:0428@localhost:5432/hivet')
with engine.begin() as conn:
    conn.execute(text("UPDATE reservations SET service = 'Package Vaccination', service_id = 4 WHERE id = 43;"))
    conn.execute(text("UPDATE reservations SET service = 'Veterinary Consultation', service_id = 3 WHERE id = 8;"))
    conn.execute(text("UPDATE reservations SET service = 'Dental Care Package', service_id = 6 WHERE id = 1;"))
    print('Updated dummy data.')
