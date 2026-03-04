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
from app.models.supplier import Supplier


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

    async def _require_supplier(self, supplier_id: int) -> None:
        result = await self.db.execute(select(Supplier.id).where(Supplier.id == supplier_id))
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail=f"Proveedor {supplier_id} no encontrado")

    async def _load_products(self, product_ids: set[int]) -> dict[int, Product]:
        result = await self.db.execute(select(Product).where(Product.id.in_(product_ids)))
        products = {product.id: product for product in result.scalars().all()}
        missing = sorted(product_ids - set(products.keys()))
        if missing:
            missing_list = ", ".join(str(item) for item in missing)
            raise HTTPException(status_code=404, detail=f"Productos no encontrados: {missing_list}")
        return products

    async def create_order(self, data):
        await self._require_supplier(data.supplier_id)
        await self._load_products({item.product_id for item in data.items})
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
        if po.status == "CLOSED":
            raise HTTPException(status_code=409, detail="OC cerrada")
        default_warehouse_id = await require_default_warehouse_id(self.db)
        requested_qty: dict[int, int] = {}
        for item in data.items:
            requested_qty[item.product_id] = requested_qty.get(item.product_id, 0) + item.qty

        order_items_result = await self.db.execute(
            select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == order_id)
        )
        order_items = order_items_result.scalars().all()
        order_items_by_product = {item.product_id: item for item in order_items}
        missing_products = sorted(set(requested_qty.keys()) - set(order_items_by_product.keys()))
        if missing_products:
            missing_list = ", ".join(str(item) for item in missing_products)
            raise HTTPException(status_code=400, detail=f"Productos fuera de la OC: {missing_list}")

        products = await self._load_products(set(requested_qty.keys()))

        for product_id, qty in requested_qty.items():
            po_item = order_items_by_product[product_id]
            pending = po_item.qty - po_item.received_qty
            if pending <= 0:
                raise HTTPException(
                    status_code=409, detail=f"Producto {product_id} ya fue recibido completamente"
                )
            if qty > pending:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cantidad recibida para producto {product_id} excede pendiente ({pending})",
                )

        async with self._transaction():
            purchase = Purchase(supplier_id=po.supplier_id, total=0)
            self.db.add(purchase)
            await self.db.flush()
            total = 0

            for product_id, qty in requested_qty.items():
                po_item = order_items_by_product[product_id]
                product = products[product_id]
                po_item.received_qty += qty
                line_total = qty * po_item.unit_cost
                total += line_total

                await apply_stock_delta(self.db, product.id, qty, default_warehouse_id)
                self.db.add(
                    StockMovement(product_id=product.id, type="IN", qty=qty, ref=f"PURCHASE:{purchase.id}")
                )

                self.db.add(
                    PurchaseItem(
                        purchase_id=purchase.id,
                        product_id=product_id,
                        qty=qty,
                        unit_cost=po_item.unit_cost,
                        line_total=line_total,
                    )
                )

            purchase.total = total
            if all(item.received_qty >= item.qty for item in order_items):
                po.status = "CLOSED"

            await log_event(self.db, self.user.id, "purchase_receive", "purchase", str(purchase.id), f"order={order_id}")
            return {"ok": True, "purchase_id": purchase.id}

    async def supplier_payment(self, data):
        await self._require_supplier(data.supplier_id)
        async with self._transaction():
            pay = SupplierPayment(**data.model_dump())
            self.db.add(pay)
            await self.db.flush()
            await log_event(self.db, self.user.id, "supplier_payment", "supplier_payment", str(pay.id), data.method)
            return {"ok": True}
