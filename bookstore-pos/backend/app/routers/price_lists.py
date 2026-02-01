from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.price_list import PriceList, PriceListItem
from app.schemas.price_list import PriceListCreate, PriceListOut, PriceListItemCreate, PriceListItemOut

router = APIRouter(prefix="/price-lists", tags=["price-lists"])


@router.get("", response_model=list[PriceListOut], dependencies=[Depends(require_role("admin", "cashier"))])
async def list_price_lists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PriceList).order_by(PriceList.id))
    return result.scalars().all()


@router.post("", response_model=PriceListOut, status_code=201, dependencies=[Depends(require_role("admin"))])
async def create_price_list(data: PriceListCreate, db: AsyncSession = Depends(get_db)):
    exists = await db.execute(select(PriceList).where(PriceList.name == data.name))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Lista duplicada")
    pl = PriceList(name=data.name)
    db.add(pl)
    await db.commit()
    await db.refresh(pl)
    return pl


@router.get("/{price_list_id}/items", response_model=list[PriceListItemOut], dependencies=[Depends(require_role("admin", "cashier"))])
async def list_items(price_list_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PriceListItem).where(PriceListItem.price_list_id == price_list_id))
    return result.scalars().all()


@router.put("/{price_list_id}/items", response_model=list[PriceListItemOut], dependencies=[Depends(require_role("admin"))])
async def replace_items(price_list_id: int, data: list[PriceListItemCreate], db: AsyncSession = Depends(get_db)):
    await db.execute(delete(PriceListItem).where(PriceListItem.price_list_id == price_list_id))
    for item in data:
        db.add(PriceListItem(price_list_id=price_list_id, product_id=item.product_id, price=item.price))
    await db.commit()
    result = await db.execute(select(PriceListItem).where(PriceListItem.price_list_id == price_list_id))
    return result.scalars().all()
