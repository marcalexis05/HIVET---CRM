from main import SessionLocal, BusinessBranch, BusinessProfile
db = SessionLocal()
# Update Branch
branch = db.query(BusinessBranch).filter(BusinessBranch.id == 3).first()
if branch:
    branch.lat = 14.7356
    branch.lng = 121.0428
    print(f"Updated Branch 3 coordinates.")

# Update Clinic profile too just in case
biz = db.query(BusinessProfile).filter(BusinessProfile.id == 1).first()
if biz:
    biz.clinic_lat = 14.7356
    biz.clinic_lng = 121.0428
    print(f"Updated Clinic 1 coordinates.")

db.commit()
db.close()
