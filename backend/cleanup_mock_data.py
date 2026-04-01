import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import Base, Customer, Order, OrderItem

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hivet.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def cleanup_mock_data():
    db = SessionLocal()
    try:
        # Find all customers with @example.com emails
        mock_customers = db.query(Customer).filter(Customer.email.like("%@example.com")).all()
        
        if not mock_customers:
            print("No mock customers found with @example.com email suffix.")
            return

        mock_customer_ids = [c.id for c in mock_customers]
        print(f"Found {len(mock_customers)} mock customers.")

        # Find orders associated with these customers
        mock_orders = db.query(Order).filter(Order.customer_id.in_(mock_customer_ids)).all()
        mock_order_ids = [o.id for o in mock_orders]
        print(f"Found {len(mock_orders)} associated orders.")

        # Delete OrderItems first (foreign key constraint safety)
        if mock_order_ids:
            items_deleted = db.query(OrderItem).filter(OrderItem.order_id.in_(mock_order_ids)).delete(synchronize_session=False)
            print(f"Deleted {items_deleted} associated order items.")

            # Delete Orders
            orders_deleted = db.query(Order).filter(Order.id.in_(mock_order_ids)).delete(synchronize_session=False)
            print(f"Deleted {orders_deleted} orders.")

        # Delete Customers
        customers_deleted = db.query(Customer).filter(Customer.id.in_(mock_customer_ids)).delete(synchronize_session=False)
        print(f"Deleted {customers_deleted} mock customers.")

        db.commit()
        print("Done. Mock data successfully purged.")

    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_mock_data()
