from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:0428@localhost:5432/hivet')
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN tag VARCHAR NULL;"))
        conn.commit()
        print("Column tag added.")
    except Exception as e:
        print("Already added or error:", e)
