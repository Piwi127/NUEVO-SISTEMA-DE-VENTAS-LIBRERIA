"""
Router de promociones.
Endpoints: GET/POST /promotions, GET/POST /promotions/rules, /pack-rules
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.deps import get_current_user, get_db, require_role
from app.models.promotion_rule import PromotionRule
from app.schemas.promotion import (
    PromotionCreate,
    PromotionOut,
    PromotionUpdate,
    PromotionRuleCreate,
    PromotionRuleOut,
    PromotionRuleUpdate,
)
from app.services.catalog.promotions_service import PromotionsService

router = APIRouter(prefix="/promotions", tags=["promotions"])


def _parse_product_ids(product_ids: str | None) -> list[int]:
    if not product_ids:
        return []
    return [int(value) for value in product_ids.split(",") if value.strip().isdigit()]


def _rule_details(rule: PromotionRule | PromotionRuleOut) -> str:
    if rule.rule_type == "BUNDLE_PRICE":
        return (
            f"{rule.name} product:{rule.product_id} type:{rule.rule_type} "
            f"{rule.bundle_qty}x{float(rule.bundle_price or 0):.2f} active:{rule.is_active}"
        )
    return (
        f"{rule.name} product:{rule.product_id} type:{rule.rule_type} "
        f"min_qty:{rule.min_qty} unit_price:{float(rule.unit_price or 0):.2f} active:{rule.is_active}"
    )


@router.get(
    "", response_model=list[PromotionOut], dependencies=[Depends(require_role("admin"))]
)
async def list_promotions(db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.list_promotions()


@router.get(
    "/active",
    response_model=list[PromotionOut],
    dependencies=[Depends(require_role("admin", "cashier"))],
)
async def list_active(db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.list_active()


@router.post(
    "",
    response_model=PromotionOut,
    status_code=201,
    dependencies=[Depends(require_role("admin"))],
)
async def create_promotion(
    data: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    created = await service.create_promotion(data)
    details = f"{created.name} {created.type}:{float(created.value):.2f} active:{created.is_active}"
    await log_event(
        db,
        current_user.id,
        "promotion_create",
        "promotion",
        str(created.id),
        details[:255],
        commit=True,
    )
    return created


@router.put(
    "/{promotion_id}",
    response_model=PromotionOut,
    dependencies=[Depends(require_role("admin"))],
)
async def update_promotion(
    promotion_id: int,
    data: PromotionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    updated = await service.update_promotion(promotion_id, data)
    details = f"{updated.name} {updated.type}:{float(updated.value):.2f} active:{updated.is_active}"
    await log_event(
        db,
        current_user.id,
        "promotion_update",
        "promotion",
        str(updated.id),
        details[:255],
        commit=True,
    )
    return updated


@router.delete("/{promotion_id}", dependencies=[Depends(require_role("admin"))])
async def delete_promotion(
    promotion_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    response = await service.delete_promotion(promotion_id)
    await log_event(
        db,
        current_user.id,
        "promotion_delete",
        "promotion",
        str(promotion_id),
        f"deleted:{promotion_id}",
        commit=True,
    )
    return response


@router.get(
    "/rules",
    response_model=list[PromotionRuleOut],
    dependencies=[Depends(require_role("admin"))],
)
async def list_rules(rule_type: str | None = None, db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.list_rules(rule_type=rule_type)


@router.get(
    "/rules/active",
    response_model=list[PromotionRuleOut],
    dependencies=[Depends(require_role("admin", "cashier"))],
)
async def list_active_rules(
    product_ids: str | None = None,
    rule_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    service = PromotionsService(db)
    return await service.list_active_rules(
        product_ids=_parse_product_ids(product_ids) or None, rule_type=rule_type
    )


@router.post(
    "/rules",
    response_model=PromotionRuleOut,
    status_code=201,
    dependencies=[Depends(require_role("admin"))],
)
async def create_rule(
    data: PromotionRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    created = await service.create_rule(data)
    await log_event(
        db,
        current_user.id,
        "promotion_rule_create",
        "promotion_rule",
        str(created.id),
        _rule_details(created)[:255],
        commit=True,
    )
    return created


@router.put(
    "/rules/{rule_id}",
    response_model=PromotionRuleOut,
    dependencies=[Depends(require_role("admin"))],
)
async def update_rule(
    rule_id: int,
    data: PromotionRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    updated = await service.update_rule(rule_id, data)
    await log_event(
        db,
        current_user.id,
        "promotion_rule_update",
        "promotion_rule",
        str(updated.id),
        _rule_details(updated)[:255],
        commit=True,
    )
    return updated


@router.delete("/rules/{rule_id}", dependencies=[Depends(require_role("admin"))])
async def delete_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    response = await service.delete_rule(rule_id)
    await log_event(
        db,
        current_user.id,
        "promotion_rule_delete",
        "promotion_rule",
        str(rule_id),
        f"deleted:{rule_id}",
        commit=True,
    )
    return response


@router.get(
    "/pack-rules",
    response_model=list[PromotionRuleOut],
    dependencies=[Depends(require_role("admin"))],
)
async def list_pack_rules(db: AsyncSession = Depends(get_db)):
    service = PromotionsService(db)
    return await service.list_pack_rules()


@router.get(
    "/pack-rules/active",
    response_model=list[PromotionRuleOut],
    dependencies=[Depends(require_role("admin", "cashier"))],
)
async def list_active_pack_rules(
    product_ids: str | None = None, db: AsyncSession = Depends(get_db)
):
    service = PromotionsService(db)
    return await service.list_active_pack_rules(_parse_product_ids(product_ids) or None)


@router.post(
    "/pack-rules",
    response_model=PromotionRuleOut,
    status_code=201,
    dependencies=[Depends(require_role("admin"))],
)
async def create_pack_rule(
    data: PromotionRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    created = await service.create_pack_rule(data)
    await log_event(
        db,
        current_user.id,
        "promotion_rule_create",
        "promotion_rule",
        str(created.id),
        _rule_details(created)[:255],
        commit=True,
    )
    return created


@router.put(
    "/pack-rules/{rule_id}",
    response_model=PromotionRuleOut,
    dependencies=[Depends(require_role("admin"))],
)
async def update_pack_rule(
    rule_id: int,
    data: PromotionRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    updated = await service.update_pack_rule(rule_id, data)
    await log_event(
        db,
        current_user.id,
        "promotion_rule_update",
        "promotion_rule",
        str(updated.id),
        _rule_details(updated)[:255],
        commit=True,
    )
    return updated


@router.delete("/pack-rules/{rule_id}", dependencies=[Depends(require_role("admin"))])
async def delete_pack_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = PromotionsService(db)
    response = await service.delete_rule(rule_id)
    await log_event(
        db,
        current_user.id,
        "promotion_rule_delete",
        "promotion_rule",
        str(rule_id),
        f"deleted:{rule_id}",
        commit=True,
    )
    return response
