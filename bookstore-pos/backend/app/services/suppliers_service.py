from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier


class SuppliersService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @asynccontextmanager
    async def _transaction(self):
        if self.db.in_transaction():
            yield
        else:
            async with self.db.begin():
                yield

    async def create_supplier(self, data):
        async with self._transaction():
            supplier = Supplier(**data.model_dump())
            self.db.add(supplier)
            await self.db.flush()
            await self.db.refresh(supplier)
            return supplier

    async def update_supplier(self, supplier_id: int, data):
        result = await self.db.execute(select(Supplier).where(Supplier.id == supplier_id))
        supplier = result.scalar_one_or_none()
        if not supplier:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        async with self._transaction():
            for key, value in data.model_dump().items():
                setattr(supplier, key, value)
            await self.db.refresh(supplier)
            return supplier

    async def delete_supplier(self, supplier_id: int):
        result = await self.db.execute(select(Supplier).where(Supplier.id == supplier_id))
        supplier = result.scalar_one_or_none()
        if not supplier:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        async with self._transaction():
            await self.db.delete(supplier)
        return {"ok": True}
