#!/usr/bin/env python3
"""Update papel lustre cost to S/ 0.18."""
import sqlite3

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Update cost for all papel lustre products
    cursor.execute('''
        UPDATE products 
        SET cost = 0.18, unit_cost = 0.18
        WHERE LOWER(name) LIKE '%papel lustre%' AND LOWER(name) LIKE '%pagoda%'
    ''')

    print(f'Actualizados: {cursor.rowcount} productos')
    print()

    # Verify
    cursor.execute('''
        SELECT id, name, price, cost
        FROM products 
        WHERE LOWER(name) LIKE '%papel lustre%' AND LOWER(name) LIKE '%pagoda%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    print('=== Estado final ===')
    for p in products:
        print(f'{p[1]}: Precio=S/ {p[2]}, Costo=S/ {p[3]}')

    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
