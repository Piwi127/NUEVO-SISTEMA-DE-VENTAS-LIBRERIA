#!/usr/bin/env python3
"""List all papel lustre products."""
import sqlite3

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Get all papers with 'lust' or 'lustre' in name
    cursor.execute('''
        SELECT id, name, price, cost, stock
        FROM products 
        WHERE LOWER(name) LIKE '%lust%' OR LOWER(name) LIKE '%lustre%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    print(f'=== TOTAL PAPELES LUSTRE: {len(products)} ===\n')

    for p in products:
        print(f'ID {p[0]}: {p[1]}')
        print(f'  Precio: S/ {p[2]}, Costo: S/ {p[3]}, Stock: {p[4]}')
        print()

    conn.close()

if __name__ == "__main__":
    main()
