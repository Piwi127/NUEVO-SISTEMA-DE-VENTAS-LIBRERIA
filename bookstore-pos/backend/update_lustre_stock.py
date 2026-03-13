#!/usr/bin/env python3
"""Update papel lustre stock: stock_min=10, stock=100."""
import sqlite3

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # First, check current stock values
    cursor.execute('''
        SELECT id, name, stock, stock_min
        FROM products 
        WHERE LOWER(name) LIKE '%papel lustre%' AND LOWER(name) LIKE '%pagoda%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    print('=== Antes de actualizar ===')
    for p in products:
        print(f'{p[1]}: Stock={p[2]}, Stock Min={p[3]}')
    print()

    # Update stock
    cursor.execute('''
        UPDATE products 
        SET stock = 100, stock_min = 10
        WHERE LOWER(name) LIKE '%papel lustre%' AND LOWER(name) LIKE '%pagoda%'
    ''')

    print(f'Actualizados: {cursor.rowcount} productos')
    print()

    conn.commit()

    # Verify
    cursor.execute('''
        SELECT id, name, price, cost, stock, stock_min
        FROM products 
        WHERE LOWER(name) LIKE '%papel lustre%' AND LOWER(name) LIKE '%pagoda%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    print('=== Despues de actualizar ===')
    for p in products:
        print(f'{p[1]}')
        print(f'  Precio: S/ {p[2]}, Costo: S/ {p[3]}, Stock: {p[4]}, Stock Min: {p[5]}')

    conn.close()

if __name__ == "__main__":
    main()
