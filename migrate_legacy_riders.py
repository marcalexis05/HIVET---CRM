import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Re-use backend's database URL and models
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from main import Customer, RiderProfile

load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_riders():
    db = SessionLocal()
    try:
        # Find all customers who are riders
        legacy_riders = db.query(Customer).filter(Customer.role == 'rider').all()
        print(f"Found {len(legacy_riders)} legacy riders in Customer table.")
        
        for customer in legacy_riders:
            print(f"Migrating rider: {customer.email}")
            # Find their corresponding rider_profile
            rider_prof = db.query(RiderProfile).filter(RiderProfile.customer_id == customer.id).first()
            
            if rider_prof:
                # Copy auth fields over
                rider_prof.email = customer.email
                rider_prof.password_hash = customer.password_hash
                rider_prof.first_name = customer.first_name
                rider_prof.last_name = customer.last_name
                rider_prof.name = customer.name or f"{customer.first_name or ''} {customer.last_name or ''}".strip()
                rider_prof.phone = customer.phone
                rider_prof.role = customer.role
                rider_prof.picture = customer.picture
                
                print(f"   -> Updated RiderProfile id {rider_prof.id} with auth data from Customer id {customer.id}")
                
                # We can now safely delete the customer row, but we need to remove the foreign key constraint
                # or set customer_id to None first.
                rider_prof.customer_id = None
            else:
                print(f"   -> No RiderProfile found for customer id {customer.id}. Creating one.")
                rider_prof = RiderProfile(
                    email=customer.email,
                    password_hash=customer.password_hash,
                    first_name=customer.first_name,
                    last_name=customer.last_name,
                    name=customer.name or f"{customer.first_name or ''} {customer.last_name or ''}".strip(),
                    phone=customer.phone,
                    role=customer.role,
                    picture=customer.picture,
                    customer_id=None,
                    compliance_status="pending"
                )
                db.add(rider_prof)
            
            db.commit()
            
            # Now delete the customer row
            db.delete(customer)
            db.commit()
            print(f"   -> Deleted Customer id {customer.id}")
            
        print("Migration complete.")
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_riders()
