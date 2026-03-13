#!/usr/bin/env python3
"""Update Papel Crepe stock and cost."""
import sqlite3

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Update stock, stock_min, and cost
    cursor.execute('''
        UPDATE products 
        SET stock = 20, stock_min = 2, cost = 0.25, unit_cost = 0.25
        WHERE LOWER(name) LIKE '%crepe%' OR LOWER(name) LIKE '%crepé%'
    ''')

    print(f'Actualizados: {cursor.rowcount} productos')
    print()

    conn.commit()

    # Verify
    cursor.execute('''
        SELECT id, name, price, cost, stock, stock_min
        FROM products 
        WHERE LOWER(name) LIKE '%crepe%' OR LOWER(name) LIKE '%crepé%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    print('=== Estado final ===')
    for p in products:
        print(f'  {p[1]}')
        print(f'    Precio: S/ {p[2]}, Costo: S/ {p[3]}, Stock: {p[4]}, Stock Min: {p[5]}')

    conn.close()

if __name__ == "__main__":
    main()
