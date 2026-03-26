"""
Router de precios y márgenes.
Endpoints: POST /catalog/pricing/preview, /products/{id}/pricing/apply, /pricing/bulk-apply
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.deps import get_current_user, get_db, require_permission
from app.models.product import Product
from app.schemas.pricing import (
    PricingApplyOut,
    PricingBulkApplyIn,
    PricingBulkApplyOut,
    PricingPreviewIn,
    PricingPreviewOut,
)
from app.services.catalog.pricing_service import (
    apply_bulk_pricing,
    apply_pricing_to_product,
    preview_pricing,
)

router = APIRouter(prefix="/catalog", tags=["catalog-pricing"])


@router.post(
    "/pricing/preview",
    response_model=PricingPreviewOut,
    dependencies=[Depends(require_permission("products.read"))],
)
async def pricing_preview(data: PricingPreviewIn):
    try:
        result = preview_pricing(
            cost_total=data.cost_total,
            qty=data.qty,
            direct_costs_breakdown=data.direct_costs_breakdown,
            desired_margin=data.desired_margin,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    return PricingPreviewOut(
        qty=result.qty,
        desired_margin=float(result.desired_margin),
        direct_costs_total=float(result.direct_costs_total),
        cost_total_all=float(result.cost_total_all),
        unit_cost=float(result.unit_cost),
        sale_price_unit=float(result.sale_price_unit),
        profit_unit=float(result.profit_unit),
    )


@router.post(
    "/products/{product_id}/pricing/apply",
    response_model=PricingApplyOut,
    dependencies=[Depends(require_permission("products.write"))],
)
async def pricing_apply(
    product_id: int,
    data: PricingPreviewIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    before_res = await db.execute(select(Product).where(Product.id == product_id))
    before = before_res.scalar_one_or_none()
    if not before:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    old_sale_price = float(before.sale_price or before.price or 0)
    old_unit_cost = float(before.unit_cost or before.cost or 0)

    try:
        _, result = await apply_pricing_to_product(db, product_id, data)
        details = (
            f"pricing_apply p:{old_sale_price:.2f}->{float(result.sale_price_unit):.2f} "
            f"c:{old_unit_cost:.2f}->{float(result.unit_cost):.2f} "
            f"m:{float(result.desired_margin):.4f}"
        )
        await log_event(
            db,
            current_user.id,
            "product_pricing_apply",
            "product",
            str(product_id),
            details[:255],
        )
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return PricingApplyOut(
        product_id=product_id,
        unit_cost=float(result.unit_cost),
        sale_price=float(result.sale_price_unit),
        profit_unit=float(result.profit_unit),
        direct_costs_total=float(result.direct_costs_total),
        cost_total_all=float(result.cost_total_all),
    )


@router.post(
    "/pricing/bulk-apply",
    response_model=PricingBulkApplyOut,
    dependencies=[Depends(require_permission("products.write"))],
)
async def pricing_bulk_apply(
    data: PricingBulkApplyIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        result = await apply_bulk_pricing(db, data)
        details = (
            f"scope={result['scope']} desired_margin={result['desired_margin']:.4f} "
            f"updated={result['updated_count']}"
        )
        await log_event(
            db,
            current_user.id,
            "product_pricing_bulk_apply",
            "product",
            "*",
            details[:255],
        )
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return PricingBulkApplyOut(**result)
