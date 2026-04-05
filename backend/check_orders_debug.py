
import sqlite3

def check_orders():
    conn = sqlite3.connect('c:/Apache24/htdocs/HIVET - CRM/backend/hivet.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, payment_method, fulfillment_method, delivery_lat, delivery_lng FROM orders")
    rows = cursor.fetchall()
    print("ID | Payment | Fulfillment | Lat | Lng")
    for r in rows:
        print(f"{r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]}")
    conn.close()

if __name__ == "__main__":
    check_orders()
