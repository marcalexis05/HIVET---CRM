from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:0428@localhost:5432/hivet')
with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, name, tag FROM products WHERE name LIKE '%Indoor Weight%';")).fetchall()
    for r in rows:
        print(f"Product: {r[1]}, Tag: {r[2]}")
