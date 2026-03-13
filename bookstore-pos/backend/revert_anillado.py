#!/usr/bin/env python3
"""Revert Cuaderno Anillado A5 price to S/ 8.00"""
import sqlite3

conn = sqlite3.connect('bookstore.db')
cursor = conn.cursor()

# Revert price for ID 287
print('Reverting Cuaderno Anillado A5 (ID 287) to S/ 8.00')
cursor.execute('SELECT name, price, cost FROM products WHERE id = 287')
row = cursor.fetchone()
print(f'Antes: {row[0]} - Precio={row[1]}, Costo={row[2]}')

cursor.execute('UPDATE products SET price = 8.0, sale_price = 8.0 WHERE id = 287')
conn.commit()

cursor.execute('SELECT price, cost FROM products WHERE id = 287')
new = cursor.fetchone()
print(f'Despues: Precio={new[0]}, Costo={new[1]}')

conn.close()
print('Listo!')
