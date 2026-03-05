from contextlib import asynccontextmanager

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.price_list import PriceListItem
from app.models.product import Product
from app.models.purchase import PurchaseItem
from app.models.purchasing import PurchaseOrderItem
from app.models.sale import SaleItem
from app.models.sale_return import SaleReturnItem
from app.models.warehouse import InventoryCount, StockBatch, StockLevel, StockTransferItem


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

    @staticmethod
    def _normalize_pricing_payload(payload: dict) -> dict:
        sale_price = payload.get("sale_price")
        if sale_price is None:
            sale_price = payload.get("price", 0)
        payload["sale_price"] = float(sale_price or 0)
        payload["price"] = float(payload["sale_price"])

        unit_cost = payload.get("unit_cost")
        if unit_cost is None:
            unit_cost = payload.get("cost", 0)
        payload["unit_cost"] = float(unit_cost or 0)
        payload["cost"] = float(payload["unit_cost"])

        qty = int(payload.get("cost_qty") or 1)
        if qty <= 0:
            qty = 1
        payload["cost_qty"] = qty

        if not payload.get("cost_total"):
            payload["cost_total"] = float(payload["unit_cost"] * qty)
        payload["direct_costs_total"] = float(payload.get("direct_costs_total") or 0)
        payload["desired_margin"] = float(payload.get("desired_margin") or 0)

        breakdown = payload.get("direct_costs_breakdown")
        payload["direct_costs_breakdown"] = breakdown if isinstance(breakdown, str) and breakdown.strip() else "{}"
        return payload

    async def create_product(self, data):
        exists = await self.db.execute(select(Product).where(Product.sku == data.sku))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU duplicado")

        initial_stock = data.stock
        payload = self._normalize_pricing_payload(data.model_dump())
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

        update_payload = self._normalize_pricing_payload(data.model_dump())
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

        usage_checks = (
            (SaleItem, "ventas"),
            (SaleReturnItem, "devoluciones"),
            (PurchaseItem, "compras"),
            (PurchaseOrderItem, "ordenes de compra"),
            (StockTransferItem, "transferencias"),
            (InventoryCount, "conteos de inventario"),
        )
        for model, label in usage_checks:
            usage = await self.db.execute(select(model.id).where(model.product_id == product_id).limit(1))
            if usage.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"No se puede eliminar el producto porque tiene {label} registradas",
                )

        try:
            async with self._transaction():
                await self.db.execute(delete(PriceListItem).where(PriceListItem.product_id == product_id))
                await self.db.execute(delete(StockBatch).where(StockBatch.product_id == product_id))
                await self.db.execute(delete(StockLevel).where(StockLevel.product_id == product_id))
                await self.db.execute(delete(StockMovement).where(StockMovement.product_id == product_id))
                await self.db.delete(product)
                await log_event(self.db, self.user.id, "product_delete", "product", str(product.id), product.sku)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar el producto porque tiene movimientos relacionados",
            ) from None
        return {"ok": True}
