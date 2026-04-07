from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:0428@localhost:5432/hivet')
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN variants_json TEXT NULL;"))
        conn.commit()
        print("Column variants_json added.")
    except Exception as e:
        print("Error adding variants_json:", e)

    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN sizes_json TEXT NULL;"))
        conn.commit()
        print("Column sizes_json added.")
    except Exception as e:
        print("Error adding sizes_json:", e)
