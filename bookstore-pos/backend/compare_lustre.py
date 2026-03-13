#!/usr/bin/env python3
"""Compare papel lustre colors between PAGODA and others."""
import sqlite3

def main():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # Get all papers with 'lust' in name
    cursor.execute('''
        SELECT id, name, price, cost, stock
        FROM products 
        WHERE LOWER(name) LIKE '%lust%'
        ORDER BY name
    ''')
    products = cursor.fetchall()

    # Extract colors from each
    print('=== Comparando colores ===\n')

    pagoda_colors = []
    other = []

    for p in products:
        name = p[1].upper()
        if 'PAGODA' in name:
            pagoda_colors.append((p[0], name, p[2], p[3]))
        else:
            other.append((p[0], name, p[2], p[3]))

    print('--- Colores en PAGODA ---')
    for c in pagoda_colors:
        print(f'  {c[1]}')

    print(f'\n--- Otros colores (sin PAGODA) ---')
    for c in other:
        print(f'  {c[1]}')

    # Check if there's overlap
    print('\n--- Comparación ---')
    pagoda_color_names = []
    for c in pagoda_colors:
        name = c[1]
        if 'AMAR' in name:
            color = 'AMARILLO'
        elif 'AZUL' in name:
            color = 'AZUL'
        elif 'BLANCO' in name:
            color = 'BLANCO'
        elif 'CELESTE' in name:
            color = 'CELESTE'
        elif 'LILA' in name:
            color = 'LILA'
        elif 'NARANJA' in name:
            color = 'NARANJA'
        elif 'NEGRO' in name:
            color = 'NEGRO'
        elif 'ROJO' in name:
            color = 'ROJO'
        elif 'ROSADO' in name:
            color = 'ROSADO'
        elif 'VERDE' in name:
            color = 'VERDE'
        else:
            color = 'OTRO'
        pagoda_color_names.append(color)

    print()
    other_colors = []
    for c in other:
        name = c[1]
        if 'AMAR' in name:
            color = 'AMARILLO'
        elif 'MARRON' in name or 'MARRÓN' in name:
            color = 'MARRON'
        elif 'MORADO' in name:
            color = 'MORADO'
        elif 'TURQUESA' in name:
            color = 'TURQUESA'
        else:
            color = 'OTRO'
        other_colors.append(color)
        print(f'  OTRO: {color}')

    print('\n--- Conclusión ---')
    print('Colores en PAGODA:', sorted(pagoda_color_names))
    print('Colores en otros:', sorted(other_colors))
    
    # Find common colors
    common = set(pagoda_color_names) & set(other_colors)
    if common:
        print(f'Colores que SE REPITEN: {common}')
    else:
        print('Solo AMARILLOW aparece en ambos')

    conn.close()

if __name__ == "__main__":
    main()
