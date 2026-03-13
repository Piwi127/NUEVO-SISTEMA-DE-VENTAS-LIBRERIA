#!/usr/bin/env python3
"""Script to update crepe paper prices in the database."""

import sqlite3
import sys

def main():
    db_path = "bookstore.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all crepe paper products before update
        cursor.execute("""
            SELECT id, name, price, cost, sale_price, unit_cost 
            FROM products 
            WHERE name LIKE '%Crepe%' OR name LIKE '%crepe%' OR name LIKE '%Papel Crepe%' OR name LIKE '%papel crepe%'
        """)
        crepes = cursor.fetchall()
        
        print(f"=== Productos Crepe encontrados: {len(crepes)} ===")
        for c in crepes:
            print(f"  ID: {c[0]}, Name: {c[1][:50]}, Price: {c[2]}, Cost: {c[3]}")
        
        print()
        
        # Update prices - S/1.00 price (keeping existing cost)
        cursor.execute("""
            UPDATE products 
            SET price = 1.00, 
                sale_price = 1.00
            WHERE name LIKE '%Crepe%' OR name LIKE '%crepe%' OR name LIKE '%Papel Crepe%' OR name LIKE '%papel crepe%'
        """)
        conn.commit()
        
        print(f"=== Actualizados: {cursor.rowcount} productos ===")
        
        # Verify after update
        cursor.execute("""
            SELECT id, name, price, cost, sale_price, unit_cost 
            FROM products 
            WHERE name LIKE '%Crepe%' OR name LIKE '%crepe%' OR name LIKE '%Papel Crepe%' OR name LIKE '%papel crepe%'
        """)
        crepes = cursor.fetchall()
        
        print(f"=== Despues de actualizar: ===")
        for c in crepes:
            print(f"  {c[1][:50]}: Precio={c[2]}, Costo={c[3]}")
        
        conn.close()
        print("\nProceso completado exitosamente!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
