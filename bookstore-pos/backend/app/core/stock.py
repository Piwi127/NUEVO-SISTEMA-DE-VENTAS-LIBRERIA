from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.settings import SystemSettings
from app.models.warehouse import StockLevel


async def get_default_warehouse_id(db: AsyncSession) -> int | None:
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    return settings.default_warehouse_id if settings else None


async def require_default_warehouse_id(db: AsyncSession) -> int:
    warehouse_id = await get_default_warehouse_id(db)
    if not warehouse_id:
        raise ValueError("Almacen por defecto no configurado")
    return warehouse_id


async def sync_product_stock_from_levels(db: AsyncSession, product_id: int) -> None:
    res = await db.execute(
        select(func.coalesce(func.sum(StockLevel.qty), 0)).where(StockLevel.product_id == product_id)
    )
    total = int(res.scalar_one() or 0)
    prod_res = await db.execute(select(Product).where(Product.id == product_id))
    product = prod_res.scalar_one_or_none()
    if product:
        product.stock = total


async def apply_stock_delta(
    db: AsyncSession,
    product_id: int,
    delta: int,
    warehouse_id: int,
) -> None:
    res = await db.execute(
        select(StockLevel).where(
            StockLevel.product_id == product_id,
            StockLevel.warehouse_id == warehouse_id,
        )
    )
    level = res.scalar_one_or_none()
    if not level:
        level = StockLevel(product_id=product_id, warehouse_id=warehouse_id, qty=0)
        db.add(level)
    next_qty = level.qty + delta
    if next_qty < 0:
        raise ValueError("Stock insuficiente en almacen")
    level.qty = next_qty
    await sync_product_stock_from_levels(db, product_id)
