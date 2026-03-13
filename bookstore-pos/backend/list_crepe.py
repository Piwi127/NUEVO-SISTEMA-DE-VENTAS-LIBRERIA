#!/usr/bin/env python3
"""List all Crepe products."""
import sqlite3

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Get all crepe products
    cursor.execute('''
        SELECT id, name, price, cost, stock, stock_min
        FROM products 
        WHERE LOWER(name) LIKE '%crepe%' OR LOWER(name) LIKE '%crepé%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    print(f'=== Total productos Crepe: {len(products)} ===\n')

    for p in products:
        print(f'ID {p[0]}: {p[1]}')
        print(f'  Precio: S/ {p[2]}, Costo: S/ {p[3]}, Stock: {p[4]}, Stock Min: {p[5]}')
        print()

    conn.close()

if __name__ == "__main__":
    main()
