#!/usr/bin/env python3
"""Script to list all notebooks (cuadernos) in the database."""

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
        
        # Get all notebooks
        cursor.execute('''
            SELECT id, name, price, cost, stock, category
            FROM products 
            WHERE name LIKE "%cuaderno%" OR name LIKE "%Cuaderno%" OR name LIKE "%CUADERNO%"
               OR name LIKE "%libreta%" OR name LIKE "%Libreta%"
               OR name LIKE "%notebook%" OR name LIKE "%Notebook%"
            ORDER BY name
        ''')
        products = cursor.fetchall()
        
        print(f"=== CUADERNOS ENCONTRADOS: {len(products)} ===\n")
        
        for i, p in enumerate(products, 1):
            print(f"{i}. ID: {p[0]}")
            print(f"   Nombre: {p[1]}")
            print(f"   Precio: S/ {p[2]}")
            print(f"   Costo: S/ {p[3]}")
            print(f"   Stock: {p[4]}")
            print(f"   Categoría: {p[5]}")
            print()
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
