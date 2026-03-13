#!/usr/bin/env python3
"""Script to update Stanford notebook prices."""

import sqlite3
import sys
import os

def main():
    db_path = "bookstore.db"
    for path in [db_path, os.path.join('..', db_path)]:
        if os.path.exists(path):
            db_path = path
            break
    
    print(f"Using database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all Stanford notebooks before update
        cursor.execute('''
            SELECT id, name, price, cost
            FROM products 
            WHERE name LIKE "%Stanford%" OR name LIKE "%standford%"
        ''')
        products = cursor.fetchall()
        
        print(f"=== Productos Stanford encontrados: {len(products)} ===")
        for p in products:
            print(f"  ID {p[0]}: {p[1][:50]} - Precio: {p[2]}, Costo: {p[3]}")
        
        print()
        
        # Update prices
        cursor.execute('''
            UPDATE products 
            SET price = 6.5, 
                sale_price = 6.5,
                cost = 4.22,
                unit_cost = 4.22
            WHERE name LIKE "%Stanford%" OR name LIKE "%standford%"
        ''')
        conn.commit()
        
        print(f"=== Actualizados: {cursor.rowcount} productos ===")
        
        # Verify after update
        cursor.execute('''
            SELECT id, name, price, cost
            FROM products 
            WHERE name LIKE "%Stanford%" OR name LIKE "%standford%"
        ''')
        products = cursor.fetchall()
        
        print(f"\n=== Despues de actualizar: ===")
        for p in products:
            print(f"  {p[1][:50]}: Precio={p[2]}, Costo={p[3]}")
        
        conn.close()
        print("\nProceso completado!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
