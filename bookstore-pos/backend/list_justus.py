#!/usr/bin/env python3
"""Script to list Justus notebooks."""
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
        
        # Search for Justus products
        cursor.execute('''
            SELECT id, name, price, cost, stock
            FROM products 
            WHERE name LIKE '%Justus%' OR name LIKE '%justus%'
            ORDER BY name
        ''')
        products = cursor.fetchall()
        
        print(f"\n=== Cuadernos Justus encontrados: {len(products)} ===\n")
        for p in products:
            print(f'ID {p[0]}: {p[1]}')
            print(f'  Precio: {p[2]}, Costo: {p[3]}, Stock: {p[4]}')
            print()
        
        # If no results, show brands of cuadernos
        if len(products) == 0:
            print("No se encontraron productos Justus.\n")
            print("=== Marcas de cuadernos en la base de datos ===")
            cursor.execute('''
                SELECT name, price, cost, stock
                FROM products 
                WHERE LOWER(name) LIKE '%cuaderno%'
                ORDER BY name
            ''')
            cuadernos = cursor.fetchall()
            print(f"\nTotal cuadernos: {len(cuadernos)}\n")
            for c in cuadernos:
                print(f'  {c[0][:60]}: S/ {c[1]} (Costo: S/ {c[2]}) - Stock: {c[3]}')
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
