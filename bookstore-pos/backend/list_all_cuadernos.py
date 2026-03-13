#!/usr/bin/env python3
"""Script to list all cuadernos by brand."""
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

        # Get all cuadernos
        cursor.execute('''
            SELECT name, price, cost, stock
            FROM products 
            WHERE LOWER(name) LIKE '%cuaderno%'
            ORDER BY name
        ''')
        cuadernos = cursor.fetchall()

        print()
        print('=== Todas las marcas de cuadernos ===')
        print(f'Total: {len(cuadernos)} cuadernos')
        print()

        # Group by brand
        brands = {}
        keywords = ['Stanford', 'Justus', 'Norma', 'Pepe', 'Loro', 'Bachiller', 'College', 'Metal', 'Scribe', 'Escola', 'Lapicero', 'Deluxe', 'Fanlux']

        for c in cuadernos:
            name = c[0]
            brand = 'Otra'
            for kw in keywords:
                if kw.lower() in name.lower():
                    brand = kw
                    break
            if brand not in brands:
                brands[brand] = []
            brands[brand].append(c)

        for brand, products in sorted(brands.items()):
            print(f'--- {brand} ({len(products)} productos) ---')
            for p in products:
                print(f'  {p[0][:55]}: S/ {p[1]} (C: S/ {p[2]})')
            print()

        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
