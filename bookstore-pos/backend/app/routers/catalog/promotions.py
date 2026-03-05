from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.schemas.promotion import (
    PromotionCreate,
    PromotionOut,
    PromotionRuleCreate,
    PromotionRuleOut,
    PromotionRuleUpdate,
)
from app.services.catalog.promotions_service import PromotionsService

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


@router.get("/pack-rules", response_model=list[PromotionRuleOut], dependencies=[Depends(require_role("admin"))])
async def list_pack_rules(db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.list_pack_rules()


@router.get("/pack-rules/active", response_model=list[PromotionRuleOut], dependencies=[Depends(require_role("admin", "cashier"))])
async def list_active_pack_rules(product_ids: str | None = None, db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    parsed_ids: list[int] = []
    if product_ids:
        parsed_ids = [int(value) for value in product_ids.split(",") if value.strip().isdigit()]
    return await service.list_active_pack_rules(parsed_ids or None)


@router.post("/pack-rules", response_model=PromotionRuleOut, status_code=201, dependencies=[Depends(require_role("admin"))])
async def create_pack_rule(data: PromotionRuleCreate, db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.create_pack_rule(data)


@router.put("/pack-rules/{rule_id}", response_model=PromotionRuleOut, dependencies=[Depends(require_role("admin"))])
async def update_pack_rule(rule_id: int, data: PromotionRuleUpdate, db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.update_pack_rule(rule_id, data)
