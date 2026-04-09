from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Setup database connection from .env
DB_URL = os.getenv("DATABASE_URL")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def migrate():
    print("Starting inventory migration for Postgres...")
    
    # 1. Get all products
    products = db.execute(text("SELECT id, business_id, stock FROM products")).fetchall()
    
    for prod_id, biz_id, global_stock in products:
        # 2. Find the main branch for this business
        # Note: In Postgres, use :param syntax and .fetchone()
        main_branch = db.execute(text("SELECT id FROM business_branches WHERE business_id = :biz_id AND is_main = true"), {"biz_id": biz_id}).fetchone()
        
        if main_branch:
            branch_id = main_branch[0]
            # 3. Check if inventory record already exists
            existing = db.execute(text("SELECT id FROM branch_inventory WHERE product_id = :p_id AND branch_id = :b_id"), {"p_id": prod_id, "b_id": branch_id}).fetchone()
            
            if not existing:
                print(f"Migrating Product {prod_id} stock ({global_stock}) to Branch {branch_id}")
                db.execute(text("INSERT INTO branch_inventory (product_id, branch_id, stock, created_at) VALUES (:p_id, :b_id, :stock, NOW())"), 
                           {"p_id": prod_id, "b_id": branch_id, "stock": global_stock})
    
    db.commit()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
