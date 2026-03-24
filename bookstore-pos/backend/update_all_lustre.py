#!/usr/bin/env python3
"""Update all papel lustre prices to S/ 0.50 and cost to S/ 0.18."""
import sqlite3

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Get all lustre products
    cursor.execute('''
        SELECT id, name, price, cost
        FROM products 
        WHERE LOWER(name) LIKE '%lust%' OR LOWER(name) LIKE '%lustre%'
    ''')
    products = cursor.fetchall()

    print(f'=== Actualizando {len(products)} papeles lustre ===')
    print('Nuevo Precio: S/ 0.50, Nuevo Costo: S/ 0.18')
    print()

    for p in products:
        print(f'ID {p[0]}: {p[1][:45]}')
        print(f'  Antes: Precio={p[2]}, Costo={p[3]}')
        
        # Update
        cursor.execute('''
            UPDATE products 
            SET price = 0.50, sale_price = 0.50, cost = 0.18, unit_cost = 0.18
            WHERE id = ?
        ''', (p[0],))
        
        # Verify
        cursor.execute('SELECT price, cost FROM products WHERE id = ?', (p[0],))
        new = cursor.fetchone()
        print(f'  Despues: Precio={new[0]}, Costo={new[1]}')
        print()

    conn.commit()
    conn.close()
    print('Proceso completado!')

if __name__ == "__main__":
    main()
