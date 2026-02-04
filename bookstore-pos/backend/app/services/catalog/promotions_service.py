from contextlib import asynccontextmanager

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.promotion import Promotion


class PromotionsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            yield
        else:
            async with self.db.begin():
                yield

    async def list_promotions(self):
        result = await self.db.execute(select(Promotion).order_by(Promotion.id.desc()))
        return result.scalars().all()

    async def list_active(self):
        result = await self.db.execute(select(Promotion).where(Promotion.is_active == True))  # noqa: E712
        return result.scalars().all()

    async def create_promotion(self, data):
        async with self._transaction():
            p = Promotion(**data.model_dump())
            self.db.add(p)
            await self.db.flush()
            await self.db.refresh(p)
            return p
