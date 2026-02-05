from contextlib import asynccontextmanager

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.stock import apply_stock_delta
from app.models.warehouse import Warehouse, StockLevel, StockTransfer, StockTransferItem, InventoryCount, StockBatch


class WarehousesService:
    def __init__(self, db: AsyncSession, current_user=None):
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

    async def list_warehouses(self):
        result = await self.db.execute(select(Warehouse).order_by(Warehouse.id))
        return result.scalars().all()

    async def create_warehouse(self, data):
        exists = await self.db.execute(select(Warehouse).where(Warehouse.name == data.name))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Almacen duplicado")
        async with self._transaction():
            w = Warehouse(**data.model_dump())
            self.db.add(w)
            await self.db.flush()
            if self.user is not None:
                await log_event(self.db, self.user.id, "warehouse_create", "warehouse", str(w.id), "")
            await self.db.refresh(w)
            return w

    async def update_warehouse(self, warehouse_id: int, data):
        result = await self.db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
        w = result.scalar_one_or_none()
        if not w:
            raise HTTPException(status_code=404, detail="Almacen no encontrado")
        async with self._transaction():
            w.name = data.name
            w.location = data.location
            if self.user is not None:
                await log_event(self.db, self.user.id, "warehouse_update", "warehouse", str(w.id), "")
            await self.db.refresh(w)
            return w

    async def create_transfer(self, data):
        if data.from_warehouse_id == data.to_warehouse_id:
            raise HTTPException(status_code=400, detail="Almacen origen y destino iguales")
        async with self._transaction():
            transfer = StockTransfer(from_warehouse_id=data.from_warehouse_id, to_warehouse_id=data.to_warehouse_id)
            self.db.add(transfer)
            await self.db.flush()
            for item in data.items:
                try:
                    await apply_stock_delta(self.db, item.product_id, -item.qty, data.from_warehouse_id)
                    await apply_stock_delta(self.db, item.product_id, item.qty, data.to_warehouse_id)
                except ValueError:
                    raise HTTPException(status_code=409, detail="Stock insuficiente en almacen origen")

                self.db.add(StockTransferItem(transfer_id=transfer.id, product_id=item.product_id, qty=item.qty))

            if self.user is not None:
                await log_event(self.db, self.user.id, "warehouse_transfer", "stock_transfer", str(transfer.id), "")
            await self.db.refresh(transfer)
            return transfer

    async def create_batch(self, data):
        async with self._transaction():
            batch = StockBatch(**data.model_dump())
            self.db.add(batch)
            await apply_stock_delta(self.db, data.product_id, data.qty, data.warehouse_id)
            if self.user is not None:
                await log_event(self.db, self.user.id, "warehouse_batch", "stock_batch", str(batch.id), "")
            return {"ok": True}

    async def create_count(self, data):
        res = await self.db.execute(
            select(StockLevel).where(
                StockLevel.product_id == data.product_id,
                StockLevel.warehouse_id == data.warehouse_id,
            )
        )
        level = res.scalar_one_or_none()
        current_qty = level.qty if level else 0
        diff = data.counted_qty - current_qty
        async with self._transaction():
            await apply_stock_delta(self.db, data.product_id, diff, data.warehouse_id)
            self.db.add(InventoryCount(**data.model_dump()))
            if self.user is not None:
                await log_event(self.db, self.user.id, "inventory_count", "inventory_count", "", f"diff={diff}")
            return {"ok": True, "diff": diff}
