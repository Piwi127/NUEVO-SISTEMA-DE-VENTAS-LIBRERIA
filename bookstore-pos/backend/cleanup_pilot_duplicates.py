#!/usr/bin/env python3
"""Script to delete duplicate Pilot products."""

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
        
        # Get pilot products
        cursor.execute('''
            SELECT id, name, price, cost 
            FROM products 
            WHERE name LIKE "%Pilot%" OR name LIKE "%PILOT%" OR name LIKE "%BOLIG%Pilot%"
        ''')
        products = cursor.fetchall()
        
        print('=== Productos Pilot encontrados ===')
        for p in products:
            print(f'  ID {p[0]}: {p[1][:45]} - Precio: {p[2]}')
        
        # IDs to keep: 36, 37, 38, 39
        # IDs to delete: 281, 464, 465, 466, 468
        ids_to_delete = [281, 464, 465, 466, 468]
        
        # Delete duplicates
        placeholders = ','.join('?' * len(ids_to_delete))
        cursor.execute(f'DELETE FROM products WHERE id IN ({placeholders})', ids_to_delete)
        deleted = cursor.rowcount
        conn.commit()
        
        print(f'\n=== Eliminados: {deleted} productos duplicados ===')
        
        # Verify remaining
        cursor.execute('''
            SELECT id, name, price, cost 
            FROM products 
            WHERE name LIKE "%Pilot%" OR name LIKE "%PILOT%" OR name LIKE "%BOLIG%Pilot%"
        ''')
        products = cursor.fetchall()
        
        print(f'\n=== Productos Pilot restantes: {len(products)} ===')
        for p in products:
            print(f'  ID {p[0]}: {p[1][:45]} - Precio: {p[2]}')
        
        conn.close()
        print('\nProceso completado!')
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
