from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem
from app.models.purchasing import PurchaseOrder, PurchaseOrderItem, SupplierPayment


class PurchasingService:
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

    async def create_order(self, data):
        total = sum(i.qty * i.unit_cost for i in data.items)
        async with self._transaction():
            po = PurchaseOrder(supplier_id=data.supplier_id, status="OPEN", total=total)
            self.db.add(po)
            await self.db.flush()
            for item in data.items:
                self.db.add(
                    PurchaseOrderItem(
                        purchase_order_id=po.id,
                        product_id=item.product_id,
                        qty=item.qty,
                        unit_cost=item.unit_cost,
                    )
                )
            await log_event(self.db, self.user.id, "purchase_order_create", "purchase_order", str(po.id), "")
            await self.db.refresh(po)
            return po

    async def receive_order(self, order_id: int, data):
        res = await self.db.execute(select(PurchaseOrder).where(PurchaseOrder.id == order_id))
        po = res.scalar_one_or_none()
        if not po:
            raise HTTPException(status_code=404, detail="OC no encontrada")
        default_warehouse_id = await require_default_warehouse_id(self.db)

        async with self._transaction():
            purchase = Purchase(supplier_id=po.supplier_id, total=0)
            self.db.add(purchase)
            await self.db.flush()
            total = 0

            for item in data.items:
                res_item = await self.db.execute(
                    select(PurchaseOrderItem).where(
                        PurchaseOrderItem.purchase_order_id == order_id,
                        PurchaseOrderItem.product_id == item.product_id,
                    )
                )
                po_item = res_item.scalar_one_or_none()
                if not po_item:
                    continue
                qty = min(item.qty, po_item.qty - po_item.received_qty)
                if qty <= 0:
                    continue
                po_item.received_qty += qty
                line_total = qty * po_item.unit_cost
                total += line_total

                prod_res = await self.db.execute(select(Product).where(Product.id == item.product_id))
                product = prod_res.scalar_one_or_none()
                if product:
                    await apply_stock_delta(self.db, product.id, qty, default_warehouse_id)
                    self.db.add(
                        StockMovement(product_id=product.id, type="IN", qty=qty, ref=f"PURCHASE:{purchase.id}")
                    )

                self.db.add(
                    PurchaseItem(
                        purchase_id=purchase.id,
                        product_id=item.product_id,
                        qty=qty,
                        unit_cost=po_item.unit_cost,
                        line_total=line_total,
                    )
                )

            purchase.total = total
            all_items = await self.db.execute(
                select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == order_id)
            )
            if all(i.received_qty >= i.qty for i in all_items.scalars().all()):
                po.status = "CLOSED"

            await log_event(self.db, self.user.id, "purchase_receive", "purchase", str(purchase.id), f"order={order_id}")
            return {"ok": True, "purchase_id": purchase.id}

    async def supplier_payment(self, data):
        async with self._transaction():
            pay = SupplierPayment(**data.model_dump())
            self.db.add(pay)
            await log_event(self.db, self.user.id, "supplier_payment", "supplier_payment", str(pay.id), data.method)
            return {"ok": True}
