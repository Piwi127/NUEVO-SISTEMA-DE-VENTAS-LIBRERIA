from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer


class CustomersService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            yield
        else:
            async with self.db.begin():
                yield

    async def create_customer(self, data):
        async with self._transaction():
            customer = Customer(**data.model_dump())
            self.db.add(customer)
            await self.db.flush()
            await self.db.refresh(customer)
            return customer

    async def update_customer(self, customer_id: int, data):
        result = await self.db.execute(select(Customer).where(Customer.id == customer_id))
        customer = result.scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        async with self._transaction():
            for key, value in data.model_dump().items():
                setattr(customer, key, value)
            await self.db.refresh(customer)
            return customer

    async def delete_customer(self, customer_id: int):
        result = await self.db.execute(select(Customer).where(Customer.id == customer_id))
        customer = result.scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        async with self._transaction():
            await self.db.delete(customer)
        return {"ok": True}
