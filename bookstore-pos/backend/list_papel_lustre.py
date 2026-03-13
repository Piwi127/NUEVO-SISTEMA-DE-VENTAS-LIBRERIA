#!/usr/bin/env python3
"""List all papel lustre products and check for duplicates."""
import sqlite3
from collections import defaultdict

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Search for papeles lustre
    cursor.execute('''
        SELECT id, name, price, cost, stock
        FROM products 
        WHERE LOWER(name) LIKE '%papel lustre%' OR LOWER(name) LIKE '%papel Lustre%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    print(f'=== Total papeles lustre: {len(products)} ===\n')

    # Check for duplicates by name
    name_counts = defaultdict(list)
    for p in products:
        name_counts[p[1]].append(p)

    print('--- Lista completa ---\n')
    for p in products:
        print(f'ID {p[0]}: {p[1]}')
        print(f'  Precio: S/ {p[2]}, Costo: S/ {p[3]}, Stock: {p[4]}')
        print()

    print('\n--- Duplicados (si hay) ---\n')
    has_duplicates = False
    for name, items in name_counts.items():
        if len(items) > 1:
            has_duplicates = True
            print(f'** {name} (aparece {len(items)} veces) **')
            for item in items:
                print(f'  ID {item[0]}: Precio S/ {item[2]}, Stock {item[4]}')
            print()

    if not has_duplicates:
        print('No hay duplicados.')

    conn.close()

if __name__ == "__main__":
    main()
