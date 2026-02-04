from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta, require_default_warehouse_id
from app.models.inventory import StockMovement
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.sale_return import SaleReturn, SaleReturnItem


class ReturnsService:
    def __init__(self, db: AsyncSession, current_user):
        self.db = db
        self.user = current_user

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            yield
        else:
            async with self.db.begin():
                yield

    async def return_sale(self, sale_id: int, data):
        res = await self.db.execute(select(Sale).where(Sale.id == sale_id))
        sale = res.scalar_one_or_none()
        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        if sale.status == "VOID":
            raise HTTPException(status_code=409, detail="Venta ya anulada")

        items_res = await self.db.execute(select(SaleItem).where(SaleItem.sale_id == sale_id))
        items = items_res.scalars().all()

        default_warehouse_id = await require_default_warehouse_id(self.db)

        async with self._transaction():
            sale.status = "VOID"
            ret = SaleReturn(sale_id=sale_id, reason=data.reason)
            self.db.add(ret)
            await self.db.flush()

            for item in items:
                prod_res = await self.db.execute(select(Product).where(Product.id == item.product_id))
                product = prod_res.scalar_one_or_none()
                if product:
                    await apply_stock_delta(self.db, product.id, item.qty, default_warehouse_id)
                    self.db.add(StockMovement(product_id=product.id, type="IN", qty=item.qty, ref=f"RETURN:{ret.id}"))
                self.db.add(SaleReturnItem(return_id=ret.id, product_id=item.product_id, qty=item.qty))

            await log_event(self.db, self.user.id, "return", "sale", str(sale_id), data.reason)
            await self.db.refresh(ret)
            return ret
