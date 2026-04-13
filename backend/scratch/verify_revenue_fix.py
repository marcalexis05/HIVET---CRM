
import asyncio
from main import get_business_analytics, get_business_recent_orders, SessionLocal, BusinessBranch, BusinessProfile
from sqlalchemy import text

async def verify_fix():
    db = SessionLocal()
    try:
        # Alpha Veterinary Clinic ID = 2 (determined previously)
        biz_id = 2
        
        # Identity User (mock current_user)
        current_user = {"sub": str(biz_id), "role": "business"}
        
        print("--- VERIFICATION ---")
        
        # 1. Total (Aggregate)
        print("\nChecking: All Branches")
        stats = await get_business_analytics(period="6m", data_type="all", branch_id=None, db=db, current_user=current_user)
        # Find the "Product Sales" KPI
        prod_kpi = next(k for k in stats['kpis'] if k['label'] == "Product Sales")
        print(f"  Product Sales: {prod_kpi['value'].replace('₱', 'PHP')}")
        # Expect 1590 (372 + 1218)
        
        # 2. Ruby St. Branch (ID 6 - Not Main)
        print("\nChecking: Ruby St. Branch (ID 6 - Non-Main)")
        stats_6 = await get_business_analytics(period="6m", data_type="all", branch_id=6, db=db, current_user=current_user)
        prod_kpi_6 = next(k for k in stats_6['kpis'] if k['label'] == "Product Sales")
        print(f"  Product Sales: {prod_kpi_6['value'].replace('₱', 'PHP')}")
        # Expect 0
        
        # 3. Main Branch (ID 7 - Main)
        print("\nChecking: Main Branch (ID 7 - Main)")
        stats_7 = await get_business_analytics(period="6m", data_type="all", branch_id=7, db=db, current_user=current_user)
        prod_kpi_7 = next(k for k in stats_7['kpis'] if k['label'] == "Product Sales")
        print(f"  Product Sales: {prod_kpi_7['value'].replace('₱', 'PHP')}")
        # 4. Check Recent Orders (Fix for NameError)
        print("\nChecking: Recent Orders (Main Branch)")
        recent = await get_business_recent_orders(branch_id=7, db=db, current_user=current_user)
        print(f"  Recent orders count: {len(recent)}")
        if recent:
            print(f"  First order ID: {recent[0]['id']}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(verify_fix())
