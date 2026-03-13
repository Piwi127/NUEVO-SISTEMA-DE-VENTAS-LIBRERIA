#!/usr/bin/env python3
"""Script to check for duplicate products in the database."""

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
        
        # Check for duplicates by SKU
        print("=== Verificando duplicados por SKU ===")
        cursor.execute('''
            SELECT sku, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
            FROM products 
            WHERE sku IS NOT NULL AND sku != ''
            GROUP BY sku
            HAVING cnt > 1
        ''')
        sku_duplicates = cursor.fetchall()
        
        if sku_duplicates:
            print(f"SKUs duplicados encontrados: {len(sku_duplicates)}")
            for dup in sku_duplicates:
                print(f"  SKU: {dup[0]} - {dup[1]} veces - IDs: {dup[2]}")
        else:
            print("No hay duplicados por SKU")
        
        # Check for duplicates by similar name (normalized)
        print("\n=== Verificando nombres duplicados (similar) ===")
        cursor.execute('''
            SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) as cnt, GROUP_CONCAT(id) as ids, GROUP_CONCAT(name) as names
            FROM products 
            WHERE name IS NOT NULL AND name != ''
            GROUP BY LOWER(TRIM(name))
            HAVING cnt > 1
        ''')
        name_duplicates = cursor.fetchall()
        
        if name_duplicates:
            print(f"Nombres duplicados encontrados: {len(name_duplicates)}")
            for dup in name_duplicates[:20]:  # Show first 20
                print(f"  Nombre: {dup[0][:50]}... - {dup[1]} veces - IDs: {dup[2]}")
            if len(name_duplicates) > 20:
                print(f"  ... y {len(name_duplicates) - 20} mas")
        else:
            print("No hay nombres duplicados")
        
        # Summary
        print("\n=== RESUMEN ===")
        cursor.execute("SELECT COUNT(*) FROM products")
        total = cursor.fetchone()[0]
        print(f"Total de productos: {total}")
        print(f"Productos con SKU duplicado: {len(sku_duplicates)}")
        print(f"Productos con nombre duplicado: {len(name_duplicates)}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
