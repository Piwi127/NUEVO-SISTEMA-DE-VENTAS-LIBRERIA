#!/usr/bin/env python3
"""Script to update Pilot/Boligrafo prices in the database."""

import sqlite3
import sys
import os

def main():
    db_path = "bookstore.db"
    
    # Try different paths
    import os
    for path in [db_path, os.path.join('..', db_path), os.path.join('backend', db_path)]:
        if os.path.exists(path):
            db_path = path
            break
    
    print(f"Using database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all pilot/boligrafo products before update
        cursor.execute("""
            SELECT id, name, price, cost, sale_price, unit_cost 
            FROM products 
            WHERE name LIKE '%Pilot%' OR name LIKE '%BOLIGRAFO%' OR name LIKE '%Boligrafo%' OR name LIKE '%PILOT%'
        """)
        products = cursor.fetchall()
        
        print(f"=== Productos Pilot/Boligrafo encontrados: {len(products)} ===")
        for p in products:
            print(f"  ID: {p[0]}, Name: {p[1][:50]}, Price: {p[2]}, Cost: {p[3]}")
        
        print()
        
        # Update prices - S/2.90 price
        cursor.execute("""
            UPDATE products 
            SET price = 2.90, 
                sale_price = 2.90
            WHERE name LIKE '%Pilot%' OR name LIKE '%BOLIGRAFO%' OR name LIKE '%Boligrafo%' OR name LIKE '%PILOT%'
        """)
        conn.commit()
        
        print(f"=== Actualizados: {cursor.rowcount} productos ===")
        
        # Verify after update
        cursor.execute("""
            SELECT id, name, price, cost, sale_price, unit_cost 
            FROM products 
            WHERE name LIKE '%Pilot%' OR name LIKE '%BOLIGRAFO%' OR name LIKE '%Boligrafo%' OR name LIKE '%PILOT%'
        """)
        products = cursor.fetchall()
        
        print(f"=== Despues de actualizar: ===")
        for p in products:
            print(f"  {p[1][:50]}: Precio={p[2]}, Costo={p[3]}")
        
        conn.close()
        print("\nProceso completado exitosamente!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
