from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.deps import get_current_user, get_db, require_role
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
async def create_promotion(data: PromotionCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = PromotionsService(db)
    created = await service.create_promotion(data)
    details = f"{created.name} {created.type}:{float(created.value):.2f} active:{created.is_active}"
    await log_event(db, current_user.id, "promotion_create", "promotion", str(created.id), details[:255], commit=True)
    return created


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
async def create_pack_rule(data: PromotionRuleCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    service = PromotionsService(db)
    created = await service.create_pack_rule(data)
    details = (
        f"{created.name} product:{created.product_id} "
        f"{created.bundle_qty}x{float(created.bundle_price):.2f} active:{created.is_active}"
    )
    await log_event(db, current_user.id, "promotion_rule_create", "promotion_rule", str(created.id), details[:255], commit=True)
    return created


@router.put("/pack-rules/{rule_id}", response_model=PromotionRuleOut, dependencies=[Depends(require_role("admin"))])
async def update_pack_rule(
    rule_id: int,
    data: PromotionRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    updated = await service.update_pack_rule(rule_id, data)
    details = (
        f"{updated.name} product:{updated.product_id} "
        f"{updated.bundle_qty}x{float(updated.bundle_price):.2f} active:{updated.is_active}"
    )
    await log_event(db, current_user.id, "promotion_rule_update", "promotion_rule", str(updated.id), details[:255], commit=True)
    return updated
