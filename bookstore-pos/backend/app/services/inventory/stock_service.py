from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.product import Product


class StockService:
    def __init__(self, db: AsyncSession, current_user):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            try:
                yield
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise
        else:
            async with self.db.begin():
                yield

    async def create_movement(self, data):
        if data.qty == 0:
            raise HTTPException(status_code=400, detail="Cantidad invalida")
        if data.type not in {"IN", "OUT", "ADJ"}:
            raise HTTPException(status_code=400, detail="Tipo invalido")
        if data.type in {"IN", "OUT"} and data.qty < 0:
            raise HTTPException(status_code=400, detail="Cantidad invalida")

        async with self._transaction():
            result = await self.db.execute(select(Product).where(Product.id == data.product_id))
            product = result.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=404, detail="Producto no encontrado")
            default_warehouse_id = await require_default_warehouse_id(self.db)
            delta = data.qty if data.type in {"IN", "ADJ"} else -data.qty
            try:
                await apply_stock_delta(self.db, data.product_id, delta, default_warehouse_id)
            except ValueError:
                raise HTTPException(status_code=409, detail="Stock insuficiente")
            movement = StockMovement(
                product_id=data.product_id,
                type=data.type,
                qty=data.qty,
                ref=data.ref,
            )
            self.db.add(movement)
            await self.db.flush()
            await log_event(self.db, self.user.id, "inventory_movement", "stock_movement", str(movement.id), data.type)
            await self.db.refresh(movement)
            return movement

    async def bulk_import(self, rows: list[dict]):
        if not rows:
            return {"ok": True, "count": 0}

        default_warehouse_id = await require_default_warehouse_id(self.db)

        async with self._transaction():
            for r in rows:
                sku = str(r.get("sku") or "").strip()
                name = str(r.get("name") or "").strip()
                if not sku or not name:
                    continue
                category = str(r.get("category") or "").strip()
                price = float(r.get("price") or 0)
                cost = float(r.get("cost") or 0)
                stock = int(float(r.get("stock") or 0))
                stock_min = int(float(r.get("stock_min") or 0))

                result = await self.db.execute(select(Product).where(Product.sku == sku))
                product = result.scalar_one_or_none()
                if product:
                    diff = stock - (product.stock or 0)
                    product.name = name
                    product.category = category
                    product.price = price
                    product.cost = cost
                    product.stock_min = stock_min
                    if diff != 0:
                        await apply_stock_delta(self.db, product.id, diff, default_warehouse_id)
                        movement = StockMovement(
                            product_id=product.id,
                            type="ADJ",
                            qty=diff,
                            ref="BULK_IMPORT",
                        )
                        self.db.add(movement)
                else:
                    product = Product(
                        sku=sku,
                        name=name,
                        category=category,
                        price=price,
                        cost=cost,
                        stock=0,
                        stock_min=stock_min,
                    )
                    self.db.add(product)
                    await self.db.flush()
                    if stock != 0:
                        await apply_stock_delta(self.db, product.id, stock, default_warehouse_id)
                        movement = StockMovement(
                            product_id=product.id,
                            type="IN",
                            qty=stock,
                            ref="BULK_IMPORT",
                        )
                        self.db.add(movement)

            await log_event(self.db, self.user.id, "inventory_import", "stock_movement", "", f"rows={len(rows)}")
            return {"ok": True, "count": len(rows)}
