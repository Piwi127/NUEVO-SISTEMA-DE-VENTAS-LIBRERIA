#!/usr/bin/env python3
"""
Script to filter products in the database, keeping only 5 specific cartulina products.
All OTHER cartulinas will be marked as INACTIVE (stock=0, tag=INACTIVO), 
but all non-cartulina products will be kept.

Usage:
    python filter_products.py

NOTE: This script does NOT delete products. Instead, it marks them as inactive
by setting stock=0 and adding a tag "INACTIVO" to preserve historical data.
"""

import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add the app directory to the path so we can import from it
sys.path.append('./app')

from app.db.session import AsyncSessionLocal
from app.models.product import Product

# List of cartulina products to KEEP (exact match on the 'name' field)
CARTS_TO_KEEP = [
    "Cartulina Escolar Amarillo Pastel 135/140 G",
    "Cartulina Escolar Verde Pastel 135/140 G",
    "Cartulina Escolar Blanco 140 G",
    "Cartulina Negro Chica 50 X 65 Cm",
    "Cartulina Escolar Rosado Pastel 135/140 G"
]


def is_cartulina(name: str) -> bool:
    """Check if a product name contains 'Cartulina' (case insensitive)."""
    return "cartulina" in name.lower()


def is_in_keep_list(name: str) -> bool:
    """Check if a product name is in the CARTS_TO_KEEP list (exact match)."""
    return name in CARTS_TO_KEEP


async def filter_products() -> None:
    """Delete cartulinas NOT in the CARTS_TO_KEEP list, keep all non-cartulina products."""
    async with AsyncSessionLocal() as session:
        try:
            # Query all products
            result = await session.execute(select(Product))
            all_products = result.scalars().all()
            
            total_products = len(all_products)
            print(f"=" * 60)
            print(f"RESUMEN DE PRODUCTOS EN LA BASE DE DATOS")
            print(f"=" * 60)
            print(f"Total de productos encontrados: {total_products}")
            print()
            
            # Categorize products
            cartulinas = []       # All products containing "Cartulina"
            non_cartulinas = []   # All products NOT containing "Cartulina"
            
            for product in all_products:
                if is_cartulina(product.name):
                    cartulinas.append(product)
                else:
                    non_cartulinas.append(product)
            
            # From cartulinas, separate which to keep vs delete
            cartulinas_to_keep = []
            cartulinas_to_delete = []
            
            for cart in cartulinas:
                if is_in_keep_list(cart.name):
                    cartulinas_to_keep.append(cart)
                else:
                    cartulinas_to_delete.append(cart)
            
            # Print detailed information
            print(f"--- CARTULINAS ---")
            print(f"Total de cartulinas en la base de datos: {len(cartulinas)}")
            print(f"Cartulinas que se MANTENDRAN: {len(cartulinas_to_keep)}")
            for cart in cartulinas_to_keep:
                print(f"  + {cart.name}")
            print(f"Cartulinas que se ELIMINARAN: {len(cartulinas_to_delete)}")
            if cartulinas_to_delete:
                print("  (Lista de cartulinas a eliminar:")
                for cart in cartulinas_to_delete:
                    print(f"    - {cart.name}")
                print("  )")
            print()
            
            print(f"--- OTROS PRODUCTOS (NO CARTULINAS) ---")
            print(f"Total de productos no-cartulina: {len(non_cartulinas)}")
            print(f"Estos productos se mantendran sin cambios.")
            print()
            
            # Summary
            print(f"=" * 60)
            print(f"RESUMEN DE OPERACION")
            print(f"=" * 60)
            print(f"Cartulinas a marcar como inactivas: {len(cartulinas_to_delete)}")
            print(f"Productos a mantener sin cambios: {len(cartulinas_to_keep) + len(non_cartulinas)}")
            print()
            
            if not cartulinas_to_delete:
                print("No hay cartulinas para marcar como inactivas. Saliendo.")
                return
            
            print("ADVERTENCIA: Se marcaran como inactivas las cartulinas no especificadas...")
            print("(Se establecera stock=0 y se agregara el tag 'INACTIVO')")
            print()
            
            # Mark cartulinas as inactive instead of deleting
            for product in cartulinas_to_delete:
                product.stock = 0
                # Add INACTIVO tag if not already present
                if product.tags:
                    if "INACTIVO" not in product.tags:
                        product.tags = product.tags + ", INACTIVO"
                else:
                    product.tags = "INACTIVO"
            
            # Commit the changes
            await session.commit()
            
            print()
            print(f"=" * 60)
            print(f"OPERACION COMPLETADA EXITOSAMENTE")
            print(f"=" * 60)
            print(f"Cartulinas marcadas como inactivas: {len(cartulinas_to_delete)}")
            print(f"Cartulinas mantenidas activas: {len(cartulinas_to_keep)}")
            print(f"Otros productos mantenidos: {len(non_cartulinas)}")
            print(f"Total productos activos: {len(cartulinas_to_keep) + len(non_cartulinas)}")
            
        except Exception as e:
            await session.rollback()
            print(f"Ocurrio un error: {e}")
            raise
        finally:
            await session.close()


if __name__ == "__main__":
    asyncio.run(filter_products())