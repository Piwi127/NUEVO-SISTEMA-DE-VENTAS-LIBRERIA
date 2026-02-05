from contextlib import asynccontextmanager

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.product import Product


class ProductsService:
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

    async def create_product(self, data):
        exists = await self.db.execute(select(Product).where(Product.sku == data.sku))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU duplicado")

        initial_stock = data.stock
        payload = data.model_dump()
        payload["stock"] = 0

        async with self._transaction():
            product = Product(**payload)
            self.db.add(product)
            await self.db.flush()

            if initial_stock:
                default_warehouse_id = await require_default_warehouse_id(self.db)
                await apply_stock_delta(self.db, product.id, initial_stock, default_warehouse_id)
                movement = StockMovement(
                    product_id=product.id,
                    type="IN",
                    qty=initial_stock,
                    ref="PRODUCT_CREATE",
                )
                self.db.add(movement)

            await log_event(self.db, self.user.id, "product_create", "product", str(product.id), product.sku)
            await self.db.refresh(product)
            return product

    async def update_product(self, product_id: int, data):
        result = await self.db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        if product.sku != data.sku:
            exists = await self.db.execute(select(Product).where(Product.sku == data.sku))
            if exists.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU duplicado")

        update_payload = data.model_dump()
        stock_delta = 0
        if update_payload.get("stock") is not None:
            stock_delta = int(update_payload["stock"]) - int(product.stock or 0)

        async with self._transaction():
            for key, value in update_payload.items():
                if key == "stock":
                    continue
                setattr(product, key, value)

            if stock_delta:
                default_warehouse_id = await require_default_warehouse_id(self.db)
                await apply_stock_delta(self.db, product.id, stock_delta, default_warehouse_id)
                self.db.add(
                    StockMovement(
                        product_id=product.id,
                        type="ADJ",
                        qty=stock_delta,
                        ref="PRODUCT_EDIT",
                    )
                )

            await log_event(self.db, self.user.id, "product_update", "product", str(product.id), product.sku)
            await self.db.refresh(product)
            return product

    async def delete_product(self, product_id: int):
        result = await self.db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        async with self._transaction():
            await self.db.delete(product)
            await log_event(self.db, self.user.id, "product_delete", "product", str(product.id), product.sku)
        return {"ok": True}
