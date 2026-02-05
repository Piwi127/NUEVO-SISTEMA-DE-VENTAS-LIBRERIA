from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.schemas.price_list import PriceListCreate, PriceListOut, PriceListItemCreate, PriceListItemOut
from app.services.catalog.price_lists_service import PriceListsService

router = APIRouter(prefix="/price-lists", tags=["price-lists"])


@router.get("", response_model=list[PriceListOut], dependencies=[Depends(require_role("admin", "cashier"))])
async def list_price_lists(db: AsyncSession = Depends(get_db)):
    service = PriceListsService(db)
    return await service.list_price_lists()


@router.post("", response_model=PriceListOut, status_code=201, dependencies=[Depends(require_role("admin"))])
async def create_price_list(data: PriceListCreate, db: AsyncSession = Depends(get_db)):
    service = PriceListsService(db)
    return await service.create_price_list(data)


@router.get("/{price_list_id}/items", response_model=list[PriceListItemOut], dependencies=[Depends(require_role("admin", "cashier"))])
async def list_items(price_list_id: int, db: AsyncSession = Depends(get_db)):
    service = PriceListsService(db)
    return await service.list_items(price_list_id)


@router.put("/{price_list_id}/items", response_model=list[PriceListItemOut], dependencies=[Depends(require_role("admin"))])
async def replace_items(price_list_id: int, data: list[PriceListItemCreate], db: AsyncSession = Depends(get_db)):
    service = PriceListsService(db)
    return await service.replace_items(price_list_id, data)
