from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price_list import PriceList, PriceListItem


class PriceListsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            yield
        else:
            async with self.db.begin():
                yield

    async def list_price_lists(self):
        result = await self.db.execute(select(PriceList).order_by(PriceList.id))
        return result.scalars().all()

    async def create_price_list(self, data):
        exists = await self.db.execute(select(PriceList).where(PriceList.name == data.name))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Lista duplicada")
        async with self._transaction():
            pl = PriceList(name=data.name)
            self.db.add(pl)
            await self.db.flush()
            await self.db.refresh(pl)
            return pl

    async def list_items(self, price_list_id: int):
        result = await self.db.execute(select(PriceListItem).where(PriceListItem.price_list_id == price_list_id))
        return result.scalars().all()

    async def replace_items(self, price_list_id: int, data):
        async with self._transaction():
            await self.db.execute(delete(PriceListItem).where(PriceListItem.price_list_id == price_list_id))
            for item in data:
                self.db.add(PriceListItem(price_list_id=price_list_id, product_id=item.product_id, price=item.price))
        result = await self.db.execute(select(PriceListItem).where(PriceListItem.price_list_id == price_list_id))
        return result.scalars().all()
