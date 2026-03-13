#!/usr/bin/env python3
"""Script to update A5 notebook prices to S/ 2.00."""
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

        # Find all A5 cuadernos
        cursor.execute('''
            SELECT id, name, price, cost
            FROM products 
            WHERE LOWER(name) LIKE '%cuaderno%' AND (LOWER(name) LIKE '%a5%' OR LOWER(name) LIKE '%a 5%')
        ''')
        cuadernos = cursor.fetchall()

        print()
        print('=== Cuadernos tamaño A5 ===')
        print(f'Encontrados: {len(cuadernos)}')
        print()

        for c in cuadernos:
            print(f'ID {c[0]}: {c[1]}')
            print(f'  Antes: Precio={c[2]}, Costo={c[3]}')
            
            # Update price
            cursor.execute('''
                UPDATE products 
                SET price = 2.0, sale_price = 2.0
                WHERE id = ?
            ''', (c[0],))
            
            # Verify
            cursor.execute('SELECT price, cost FROM products WHERE id = ?', (c[0],))
            new = cursor.fetchone()
            print(f'  Despues: Precio={new[0]}, Costo={new[1]}')
            print()

        conn.commit()
        conn.close()
        print('Proceso completado!')
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
