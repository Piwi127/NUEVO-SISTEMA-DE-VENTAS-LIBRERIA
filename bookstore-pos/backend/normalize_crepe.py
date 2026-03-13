#!/usr/bin/env python3
"""Normalize Papel Crepe products: standardize names, remove duplicates, update prices."""
import sqlite3
from collections import defaultdict

def extract_color(name):
    """Extract color from product name."""
    name_upper = name.upper()
    
    # Color mapping
    colors_map = {
        'AMAR': 'AMARILLO',
        'AMARILLO': 'AMARILLO',
        'AZUL': 'AZUL',
        'AZULINO': 'AZUL',
        'BLANCO': 'BLANCO',
        'CELESTE': 'CELESTE',
        'FUSCIA': 'FUCIA',
        'FUCIA': 'FUCIA',
        'LILA': 'LILA',
        'MARRON': 'MARRON',
        'MARRÓN': 'MARRON',
        'MELON': 'MELÓN',
        'MELÓN': 'MELÓN',
        'MORADO': 'MORADO',
        'NARANJA': 'NARANJA',
        'NEGRO': 'NEGRO',
        'ROJO': 'ROJO',
        'ROSADO': 'ROSADO',
        'VERDE CL': 'VERDE LIMÓN',
        'VERDE LIMON': 'VERDE LIMÓN',
        'VERDE OSC': 'VERDE OSCURO',
        'VERDE OSCURO': 'VERDE OSCURO',
    }
    
    for keyword, color in colors_map.items():
        if keyword in name_upper:
            return color
    
    return 'OTRO'

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Get all crepe products
    cursor.execute('''
        SELECT id, name, price, cost, stock
        FROM products 
        WHERE LOWER(name) LIKE '%crepe%' OR LOWER(name) LIKE '%crepé%'
    ''')
    products = cursor.fetchall()

    print(f'=== Total productos encontrados: {len(products)} ===\n')
    
    # Step 1: Update names and prices
    print('--- ACTUALIZANDO NOMBRES Y PRECIOS ---\n')
    
    updated = []
    for p in products:
        old_name = p[1]
        color = extract_color(old_name)
        new_name = f'Papel Crepé {color} X 1 Und'
        
        print(f'ID {p[0]}:')
        print(f'  Antes: {old_name}')
        print(f'  Color: {color}')
        print(f'  Nuevo: {new_name}')
        
        # Update name and price
        cursor.execute('''
            UPDATE products SET name = ?, price = 1.00, sale_price = 1.00 WHERE id = ?
        ''', (new_name, p[0]))
        
        updated.append((p[0], new_name, color, p[4]))
        print()
    
    conn.commit()
    
    # Step 2: Find duplicates
    print('--- BUSCANDO DUPLICADOS ---\n')
    
    # Get all updated products
    cursor.execute('''
        SELECT id, name, price, cost, stock
        FROM products 
        WHERE LOWER(name) LIKE '%crepé%' AND LOWER(name) LIKE '%x 1 und%'
    ''')
    all_crepe = cursor.fetchall()
    
    # Group by name (color)
    color_groups = defaultdict(list)
    for p in all_crepe:
        color_groups[p[1]].append(p)
    
    print(f'Colores únicos encontrados: {len(color_groups)}\n')
    
    for color, items in sorted(color_groups.items()):
        print(f'{color}: {len(items)} producto(s)')
        for item in items:
            print(f'  ID {item[0]}: S/ {item[2]} (Stock: {item[4]})')
        print()
    
    # Step 3: Remove duplicates (keep one with highest stock)
    print('--- ELIMINANDO DUPLICADOS ---\n')
    
    deleted = []
    for color, items in color_groups.items():
        if len(items) > 1:
            # Sort by stock descending, keep first
            items_sorted = sorted(items, key=lambda x: x[4], reverse=True)
            keep = items_sorted[0]
            remove = items_sorted[1:]
            
            print(f'{color}:')
            print(f'  Mantener: ID {keep[0]} (Stock: {keep[4]})')
            
            for item in remove:
                print(f'  Eliminar: ID {item[0]} (Stock: {item[4]})')
                cursor.execute('DELETE FROM products WHERE id = ?', (item[0],))
                deleted.append(item[0])
            print()
    
    conn.commit()
    
    # Step 4: Final state
    print('--- ESTADO FINAL ---\n')
    
    cursor.execute('''
        SELECT id, name, price, cost, stock
        FROM products 
        WHERE LOWER(name) LIKE '%crepé%' AND LOWER(name) LIKE '%x 1 und%'
        ORDER BY name
    ''')
    final = cursor.fetchall()
    
    print(f'Total productos finales: {len(final)}\n')
    for p in final:
        print(f'  ID {p[0]}: {p[1]}')
        print(f'    Precio: S/ {p[2]}, Costo: S/ {p[3]}, Stock: {p[4]}')
    
    print()
    print('=== RESUMEN ===')
    print(f'Productos actualizados: {len(updated)}')
    print(f'Colores únicos: {len(color_groups)}')
    print(f'Duplicados eliminados: {len(deleted)}')
    print(f'Productos finales: {len(final)}')
    
    conn.close()

if __name__ == "__main__":
    main()
