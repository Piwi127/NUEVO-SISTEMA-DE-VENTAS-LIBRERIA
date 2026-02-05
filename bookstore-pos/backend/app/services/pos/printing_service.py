from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.settings import SystemSettings


class PrintingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_receipt(self, sale_id: int):
        res = await self.db.execute(select(Sale).where(Sale.id == sale_id))
        sale = res.scalar_one_or_none()
        if not sale:
            return None, None, None

        items_res = await self.db.execute(
            select(SaleItem, Product.name)
            .join(Product, Product.id == SaleItem.product_id)
            .where(SaleItem.sale_id == sale_id)
        )
        items = [(row.SaleItem, row.name) for row in items_res.all()]

        settings_res = await self.db.execute(select(SystemSettings).limit(1))
        settings = settings_res.scalar_one_or_none()
        return sale, items, settings
