import sys
import os

# Add the current directory to path so we can import from backend
sys.path.append(os.path.abspath("backend"))

from main import SessionLocal, Product, BusinessProfile, BusinessBranch, Order, OrderItem

def check_product_owner():
    db = SessionLocal()
    try:
        print("Searching for product 'Sensitive Stomach Quail'...")
        p = db.query(Product).filter(Product.name.ilike("%Sensitive Stomach Quail%")).first()
        if p:
            print(f"Product ID: {p.id}")
            print(f"Business ID: {p.business_id}")
            biz = db.query(BusinessProfile).filter(BusinessProfile.id == p.business_id).first()
            if biz:
                print(f"Clinic Owner: {biz.clinic_name}")
            
            # Check the latest order for this product
            item = db.query(OrderItem).filter(OrderItem.product_id == p.id).order_by(OrderItem.order_id.desc()).first()
            if item:
                o = db.query(Order).filter(Order.id == item.order_id).first()
                print(f"\nLatest Order ID: {o.id}")
                print(f"Order Clinic ID: {o.clinic_id}")
                print(f"Order Branch ID: {o.branch_id}")
                
                if o.branch_id:
                    b = db.query(BusinessBranch).filter(BusinessBranch.id == o.branch_id).first()
                    print(f"Branch Details: {b.name}, Address: {b.address_line1}, Granular: {b.street}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_product_owner()
