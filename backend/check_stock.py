import sqlite3, json

conn = sqlite3.connect('crm.db')
cur = conn.cursor()
cur.execute("SELECT id, name, sizes_json, variants_json, stock FROM products WHERE name LIKE ?", ('%DOG FOOD 1%',))
rows = cur.fetchall()

for row in rows:
    print(f"ID: {row[0]}, Name: {row[1]}, Stock: {row[4]}")
    print("Sizes JSON:")
    print(json.dumps(json.loads(row[2]) if row[2] else None, indent=2))
    print("Variants JSON:")
    print(json.dumps(json.loads(row[3]) if row[3] else None, indent=2))
    print("-" * 50)

cur.execute("SELECT * FROM branch_inventory WHERE product_id = ?", (rows[0][0],)) if rows else None
inv = cur.fetchall()
print("Branch Inventory Table:")
for i in inv:
    print(i)

conn.close()
