import sqlite3
import psycopg2
from sqlalchemy import create_engine, text

# Database connection URL (PostgreSQL)
DATABASE_URL = "postgresql://postgres:0428@localhost:5432/hivet"

def backfill_reservations_to_branch():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Starting backfill of reservations and orders to main branches...")
        
        # 1. Get all businesses and their main branch (or first branch)
        businesses = conn.execute(text("""
            SELECT b.id as business_id, br.id as branch_id 
            FROM business_profiles b
            JOIN business_branches br ON b.id = br.business_id
            WHERE br.is_main = TRUE
        """)).fetchall()
        
        print(f"Found {len(businesses)} businesses with main branches.")
        
        total_updated_res = 0
        total_updated_orders = 0
        for biz in businesses:
            res = conn.execute(text("""
                UPDATE reservations 
                SET branch_id = :branch_id 
                WHERE business_id = :business_id AND branch_id IS NULL
            """), {"branch_id": biz.branch_id, "business_id": biz.business_id})
            total_updated_res += res.rowcount
            
            res_orders = conn.execute(text("""
                UPDATE orders 
                SET branch_id = :branch_id 
                WHERE clinic_id = :business_id AND branch_id IS NULL
            """), {"branch_id": biz.branch_id, "business_id": biz.business_id})
            total_updated_orders += res_orders.rowcount
            
        # 2. For businesses without a 'main' branch, just use the first branch found
        remaining = conn.execute(text("""
            SELECT b.id as business_id, MIN(br.id) as branch_id
            FROM business_profiles b
            JOIN business_branches br ON b.id = br.business_id
            WHERE b.id NOT IN (SELECT business_id FROM business_branches WHERE is_main = TRUE)
            GROUP BY b.id
        """)).fetchall()
        
        for biz in remaining:
            res = conn.execute(text("""
                UPDATE reservations 
                SET branch_id = :branch_id 
                WHERE business_id = :business_id AND branch_id IS NULL
            """), {"branch_id": biz.branch_id, "business_id": biz.business_id})
            total_updated_res += res.rowcount

            res_orders = conn.execute(text("""
                UPDATE orders 
                SET branch_id = :branch_id 
                WHERE clinic_id = :business_id AND branch_id IS NULL
            """), {"branch_id": biz.branch_id, "business_id": biz.business_id})
            total_updated_orders += res_orders.rowcount
            
        conn.commit()
        print(f"Backfill complete.")
        print(f"Total reservations updated: {total_updated_res}")
        print(f"Total orders updated: {total_updated_orders}")

if __name__ == "__main__":
    backfill_reservations_to_branch()
