import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as con:
    con.execute(text("DROP TABLE customer CASCADE"))
    con.commit()
    print("Table dropped!")
