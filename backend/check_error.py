
from main import SessionLocal, Order, OrderItem
db = SessionLocal()
try:
    order = Order(customer_id=1, status='Pending', total_amount=150, fulfillment_method='pickup', payment_method='cash', clinic_id=1, branch_id=1, delivery_address='Test', contact_name='Test', contact_phone='123')
    db.add(order)
    db.commit()
    print('SUCCESS')
except Exception as e:
    import traceback
    with open('error_log.txt', 'w', encoding='utf-8') as f:
        f.write(traceback.format_exc())
    print('Wrote error to log')
