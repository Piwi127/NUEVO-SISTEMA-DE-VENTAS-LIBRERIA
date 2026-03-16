#!/usr/bin/env python3
"""Script to update cartulina prices in the database."""

import sqlite3
import sys

def main():
    db_path = "bookstore.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all cartulinas before update
        cursor.execute("""
            SELECT id, name, price, cost, sale_price, unit_cost 
            FROM products 
            WHERE name LIKE '%Cartulina%' OR name LIKE '%cartulina%'
        """)
        cartulinas = cursor.fetchall()
        
        print(f"=== Cartulinas encontradas: {len(cartulinas)} ===")
        for c in cartulinas:
            print(f"  ID: {c[0]}, Name: {c[1][:50]}, Price: {c[2]}, Cost: {c[3]}")
        
        print()
        
        # Update prices - S/1.00 price and S/0.15 cost
        cursor.execute("""
            UPDATE products 
            SET price = 1.00, 
                sale_price = 1.00, 
                cost = 0.15, 
                unit_cost = 0.15 
            WHERE name LIKE '%Cartulina%' OR name LIKE '%cartulina%'
        """)
        conn.commit()
        
        print(f"=== Actualizados: {cursor.rowcount} productos ===")
        
        # Verify after update
        cursor.execute("""
            SELECT id, name, price, cost, sale_price, unit_cost 
            FROM products 
            WHERE name LIKE '%Cartulina%' OR name LIKE '%cartulina%'
        """)
        cartulinas = cursor.fetchall()
        
        print("=== Despues de actualizar: ===")
        for c in cartulinas:
            print(f"  {c[1][:50]}: Precio={c[2]}, Costo={c[3]}")
        
        conn.close()
        print("\nProceso completado exitosamente!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
