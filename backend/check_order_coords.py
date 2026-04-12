from main import SessionLocal, Order, BusinessBranch, BusinessProfile
db = SessionLocal()
order = db.query(Order).filter(Order.id == 110).first()
if order:
    print(f"Order 110 - BranchID: {order.branch_id}, ClinicID: {order.clinic_id}")
    if order.branch_id:
        branch = db.query(BusinessBranch).filter(BusinessBranch.id == order.branch_id).first()
        if branch:
            print(f"Branch: {branch.name}, Lat: {branch.lat}, Lng: {branch.lng}")
    if order.clinic_id:
        biz = db.query(BusinessProfile).filter(BusinessProfile.id == order.clinic_id).first()
        if biz:
            print(f"Clinic: {biz.clinic_name}, Lat: {biz.clinic_lat}, Lng: {biz.clinic_lng}")
db.close()
