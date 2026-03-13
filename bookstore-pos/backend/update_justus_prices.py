#!/usr/bin/env python3
"""Script to update Justus notebook prices."""
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

        # IDs to update: 85 (Rayado), 320 (Triple Renglón Deluxe), 90 (Triple Renglón)
        ids = [85, 320, 90]

        print()
        print('=== Actualizando cuadernos Justus ===')
        print('Nuevo Precio: S/ 4.50, Nuevo Costo: S/ 3.30')
        print()

        for pid in ids:
            # Get current data
            cursor.execute('SELECT name, price, cost FROM products WHERE id = ?', (pid,))
            row = cursor.fetchone()
            if row:
                print(f'ID {pid}: {row[0]}')
                print(f'  Antes: Precio={row[1]}, Costo={row[2]}')

                # Update
                cursor.execute('''
                    UPDATE products 
                    SET price = 4.50, sale_price = 4.50, cost = 3.30, unit_cost = 3.30
                    WHERE id = ?
                ''', (pid,))

                # Verify
                cursor.execute('SELECT price, cost FROM products WHERE id = ?', (pid,))
                new = cursor.fetchone()
                print(f'  Despues: Precio={new[0]}, Costo={new[1]}')
                print()
            else:
                print(f'ID {pid}: No encontrado')
                print()

        conn.commit()
        conn.close()
        print('Proceso completado!')
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
