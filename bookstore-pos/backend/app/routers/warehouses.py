from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.warehouse import Warehouse, StockLevel, StockTransfer, StockTransferItem, InventoryCount, StockBatch
from app.models.product import Product
from app.schemas.warehouse import WarehouseCreate, WarehouseOut, WarehouseUpdate, TransferCreate, TransferOut, BatchCreate, InventoryCountCreate

router = APIRouter(prefix="/warehouses", tags=["warehouses"], dependencies=[Depends(require_role("admin", "stock"))])


@router.get("", response_model=list[WarehouseOut])
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Warehouse).order_by(Warehouse.id))
    return result.scalars().all()


@router.post("", response_model=WarehouseOut, status_code=201)
async def create_warehouse(data: WarehouseCreate, db: AsyncSession = Depends(get_db)):
    exists = await db.execute(select(Warehouse).where(Warehouse.name == data.name))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Almacen duplicado")
    w = Warehouse(**data.model_dump())
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return w


@router.put("/{warehouse_id}", response_model=WarehouseOut)
async def update_warehouse(warehouse_id: int, data: WarehouseUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404, detail="Almacen no encontrado")
    w.name = data.name
    w.location = data.location
    await db.commit()
    await db.refresh(w)
    return w


@router.post("/transfer", response_model=TransferOut, status_code=201)
async def create_transfer(data: TransferCreate, db: AsyncSession = Depends(get_db)):
    if data.from_warehouse_id == data.to_warehouse_id:
        raise HTTPException(status_code=400, detail="Almacen origen y destino iguales")
    async with db.begin():
        transfer = StockTransfer(from_warehouse_id=data.from_warehouse_id, to_warehouse_id=data.to_warehouse_id)
        db.add(transfer)
        await db.flush()
        for item in data.items:
            # update stock levels
            res = await db.execute(select(StockLevel).where(
                StockLevel.product_id == item.product_id,
                StockLevel.warehouse_id == data.from_warehouse_id,
            ))
            from_level = res.scalar_one_or_none()
            if not from_level or from_level.qty < item.qty:
                raise HTTPException(status_code=409, detail="Stock insuficiente en almacen origen")
            from_level.qty -= item.qty
            res2 = await db.execute(select(StockLevel).where(
                StockLevel.product_id == item.product_id,
                StockLevel.warehouse_id == data.to_warehouse_id,
            ))
            to_level = res2.scalar_one_or_none()
            if not to_level:
                to_level = StockLevel(product_id=item.product_id, warehouse_id=data.to_warehouse_id, qty=0)
                db.add(to_level)
            to_level.qty += item.qty

            db.add(StockTransferItem(transfer_id=transfer.id, product_id=item.product_id, qty=item.qty))

    await db.refresh(transfer)
    return transfer


@router.post("/batch", status_code=201)
async def create_batch(data: BatchCreate, db: AsyncSession = Depends(get_db)):
    batch = StockBatch(**data.model_dump())
    db.add(batch)
    # update stock level
    res = await db.execute(select(StockLevel).where(
        StockLevel.product_id == data.product_id,
        StockLevel.warehouse_id == data.warehouse_id,
    ))
    level = res.scalar_one_or_none()
    if not level:
        level = StockLevel(product_id=data.product_id, warehouse_id=data.warehouse_id, qty=0)
        db.add(level)
    level.qty += data.qty
    await db.commit()
    return {"ok": True}


@router.post("/count", status_code=201)
async def create_count(data: InventoryCountCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(StockLevel).where(
        StockLevel.product_id == data.product_id,
        StockLevel.warehouse_id == data.warehouse_id,
    ))
    level = res.scalar_one_or_none()
    if not level:
        level = StockLevel(product_id=data.product_id, warehouse_id=data.warehouse_id, qty=0)
        db.add(level)
    diff = data.counted_qty - level.qty
    level.qty = data.counted_qty
    db.add(InventoryCount(**data.model_dump()))
    await db.commit()
    return {"ok": True, "diff": diff}
