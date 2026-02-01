from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.promotion import Promotion
from app.schemas.promotion import PromotionCreate, PromotionOut

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("", response_model=list[PromotionOut], dependencies=[Depends(require_role("admin"))])
async def list_promotions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Promotion).order_by(Promotion.id.desc()))
    return result.scalars().all()


@router.get("/active", response_model=list[PromotionOut], dependencies=[Depends(require_role("admin", "cashier"))])
async def list_active(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Promotion).where(Promotion.is_active == True))  # noqa: E712
    return result.scalars().all()


@router.post("", response_model=PromotionOut, status_code=201, dependencies=[Depends(require_role("admin"))])
async def create_promotion(data: PromotionCreate, db: AsyncSession = Depends(get_db)):
    p = Promotion(**data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p
