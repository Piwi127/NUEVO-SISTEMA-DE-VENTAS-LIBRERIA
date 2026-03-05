from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission
from app.schemas.pricing import PricingApplyOut, PricingPreviewIn, PricingPreviewOut
from app.services.catalog.pricing_service import apply_pricing_to_product, preview_pricing

router = APIRouter(prefix="/catalog", tags=["catalog-pricing"])


@router.post("/pricing/preview", response_model=PricingPreviewOut, dependencies=[Depends(require_permission("products.read"))])
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
async def pricing_apply(product_id: int, data: PricingPreviewIn, db: AsyncSession = Depends(get_db)):
    async with db.begin():
        _, result = await apply_pricing_to_product(db, product_id, data)

    return PricingApplyOut(
        product_id=product_id,
        unit_cost=float(result.unit_cost),
        sale_price=float(result.sale_price_unit),
        profit_unit=float(result.profit_unit),
        direct_costs_total=float(result.direct_costs_total),
        cost_total_all=float(result.cost_total_all),
    )
