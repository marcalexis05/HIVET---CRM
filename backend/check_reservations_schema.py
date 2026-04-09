from sqlalchemy import create_engine, inspect
DATABASE_URL = "postgresql://postgres:0428@localhost:5432/hivet"
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
cols = [c['name'] for c in inspector.get_columns("reservations")]
print(f"Columns in reservations: {cols}")
