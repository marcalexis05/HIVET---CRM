import os
from datetime import datetime, timedelta
import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import Base, BusinessProfile, Product, Order, OrderItem, Customer

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hivet.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def seed_business_dashboard():
    db = SessionLocal()
    try:
        # 1. Get the target business
        biz = db.query(BusinessProfile).filter(BusinessProfile.email == "business@hivet.com").first()
        if not biz:
            print("Business not found! Run seed_catalog.py first.")
            return

        biz_id = biz.id
        print(f"Seeding for Business ID: {biz_id} ({biz.clinic_name})")

        # 2. Get business products
        products = db.query(Product).filter(Product.business_id == biz_id).all()
        if not products:
            print("No products found for this business. Run seed_catalog.py first.")
            return

        customers = []
        # No more mock customers added from here

        # 4. Generate Orders for the past 6 months
        statuses = ["Completed", "Processing", "Pending", "Cancelled"]
        pay_methods = ["GCash", "Credit Card", "Cash on Pickup"]
        fulfill_methods = ["delivery", "pickup"]

        now = datetime.utcnow()
        for i in range(50): # 50 random orders
            days_ago = random.randint(0, 180)
            order_date = now - timedelta(days=days_ago)
            cust = random.choice(customers)
            
            # Create Order
            order = Order(
                customer_id=cust.id,
                status=random.choice(statuses) if days_ago > 5 else "Pending", # Newer orders more likely pending
                total_amount=0, # Will calculate
                fulfillment_method=random.choice(fulfill_methods),
                payment_method=random.choice(pay_methods),
                created_at=order_date
            )
            db.add(order)
            db.flush() # Get order.id

            # Add 1-3 items to this order from THIS business
            num_items = random.randint(1, 3)
            order_total = 0
            order_prods = random.sample(products, num_items)
            
            for p in order_prods:
                qty = random.randint(1, 4)
                price = int(p.price)
                item_total = price * qty
                order_total += item_total
                
                oi = OrderItem(
                    order_id=order.id,
                    product_id=p.id,
                    product_name=p.name,
                    price=price,
                    quantity=qty,
                    image=p.image
                )
                db.add(oi)
            
            order.total_amount = order_total

        db.commit()
        print("Successfully seeded 50 orders for the business dashboard!")

    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_business_dashboard()
