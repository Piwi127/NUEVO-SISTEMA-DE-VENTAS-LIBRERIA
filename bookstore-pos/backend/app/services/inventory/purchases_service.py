from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.metrics import purchases_amount_total, purchases_total
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem
from app.models.supplier import Supplier


class PurchasesService:
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

    async def create_purchase(self, data):
        supplier_result = await self.db.execute(select(Supplier).where(Supplier.id == data.supplier_id))
        if supplier_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail=f"Proveedor {data.supplier_id} no encontrado")
        default_warehouse_id = await require_default_warehouse_id(self.db)
        async with self._transaction():
            purchase = Purchase(supplier_id=data.supplier_id, total=0.0)
            self.db.add(purchase)
            await self.db.flush()
            calculated_total = 0.0

            for item in data.items:
                prod_result = await self.db.execute(select(Product).where(Product.id == item.product_id))
                product = prod_result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
                await apply_stock_delta(self.db, product.id, item.qty, default_warehouse_id)
                line_total = item.unit_cost * item.qty
                calculated_total += line_total
                p_item = PurchaseItem(
                    purchase_id=purchase.id,
                    product_id=product.id,
                    qty=item.qty,
                    unit_cost=item.unit_cost,
                    line_total=line_total,
                )
                self.db.add(p_item)
                movement = StockMovement(
                    product_id=product.id,
                    type="IN",
                    qty=item.qty,
                    ref=f"PURCHASE:{purchase.id}",
                )
                self.db.add(movement)

            purchase.total = calculated_total
            purchases_total.inc()
            purchases_amount_total.inc(float(calculated_total))
            await log_event(self.db, self.user.id, "purchase_create", "purchase", str(purchase.id), "")
            await self.db.refresh(purchase)
            return purchase
