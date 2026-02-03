from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.schemas.promotion import PromotionCreate, PromotionOut
from app.services.promotions_service import PromotionsService

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("", response_model=list[PromotionOut], dependencies=[Depends(require_role("admin"))])
async def list_promotions(db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.list_promotions()


@router.get("/active", response_model=list[PromotionOut], dependencies=[Depends(require_role("admin", "cashier"))])
async def list_active(db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.list_active()


@router.post("", response_model=PromotionOut, status_code=201, dependencies=[Depends(require_role("admin"))])
async def create_promotion(data: PromotionCreate, db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.create_promotion(data)
