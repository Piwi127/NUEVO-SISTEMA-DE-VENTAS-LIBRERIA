"""
Servicio de precios y márgenes.
Calcula precios de venta basados en costos y margen deseado.
"""

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.schemas.pricing import PricingBulkApplyIn, PricingPreviewIn

MONEY_QUANT = Decimal("0.01")


def _to_decimal(value, field_name: str) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise ValueError(f"{field_name} invalido") from None


def _quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class PricingPreviewResult:
    qty: int
    desired_margin: Decimal
    direct_costs_total: Decimal
    cost_total_all: Decimal
    unit_cost: Decimal
    sale_price_unit: Decimal
    profit_unit: Decimal
    direct_costs_breakdown: dict[str, Decimal]


def preview_pricing(
    cost_total: Decimal | str | float,
    qty: int,
    direct_costs_breakdown: dict[str, Decimal | str | float],
    desired_margin: Decimal | str | float,
) -> PricingPreviewResult:
    qty_int = int(qty)
    if qty_int <= 0:
        raise ValueError("qty debe ser mayor que 0")

    cost_total_dec = _to_decimal(cost_total, "cost_total")
    if cost_total_dec < 0:
        raise ValueError("cost_total debe ser mayor o igual a 0")

    margin = _to_decimal(desired_margin, "desired_margin")
    if margin < 0 or margin >= 1:
        raise ValueError("desired_margin debe estar entre 0 y menor que 1")

    normalized_breakdown: dict[str, Decimal] = {}
    direct_costs_total = Decimal("0")
    for key, raw_value in (direct_costs_breakdown or {}).items():
        amount = _to_decimal(raw_value, f"direct_costs_breakdown.{key}")
        if amount < 0:
            raise ValueError(f"direct_costs_breakdown.{key} no puede ser negativo")
        normalized_breakdown[key] = amount
        direct_costs_total += amount

    cost_total_all = cost_total_dec + direct_costs_total
    divisor = Decimal("1") - margin
    sale_price_unit_raw = (cost_total_all / divisor) / Decimal(qty_int)
    unit_cost_raw = cost_total_all / Decimal(qty_int)
    profit_unit_raw = sale_price_unit_raw - unit_cost_raw

    return PricingPreviewResult(
        qty=qty_int,
        desired_margin=margin,
        direct_costs_total=_quantize_money(direct_costs_total),
        cost_total_all=_quantize_money(cost_total_all),
        unit_cost=_quantize_money(unit_cost_raw),
        sale_price_unit=_quantize_money(sale_price_unit_raw),
        profit_unit=_quantize_money(profit_unit_raw),
        direct_costs_breakdown=normalized_breakdown,
    )


async def apply_pricing_to_product(
    db: AsyncSession, product_id: int, payload: PricingPreviewIn
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    try:
        preview = preview_pricing(
            cost_total=payload.cost_total,
            qty=payload.qty,
            direct_costs_breakdown=payload.direct_costs_breakdown,
            desired_margin=payload.desired_margin,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    product.cost_total = _quantize_money(_to_decimal(payload.cost_total, "cost_total"))
    product.cost_qty = preview.qty
    product.direct_costs_breakdown = json.dumps(
        {
            key: float(_quantize_money(value))
            for key, value in preview.direct_costs_breakdown.items()
        },
        ensure_ascii=False,
    )
    product.direct_costs_total = preview.direct_costs_total
    product.desired_margin = preview.desired_margin
    product.unit_cost = preview.unit_cost
    product.cost = float(preview.unit_cost)
    product.sale_price = preview.sale_price_unit
    product.price = float(preview.sale_price_unit)

    await db.flush()
    await db.refresh(product)
    return product, preview


def _parse_breakdown_json(raw: str | None) -> dict[str, Decimal]:
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(payload, dict):
        return {}
    normalized: dict[str, Decimal] = {}
    for key, value in payload.items():
        try:
            amount = _to_decimal(value, f"direct_costs_breakdown.{key}")
        except ValueError:
            continue
        if amount < 0:
            continue
        normalized[str(key)] = amount
    return normalized


async def apply_bulk_pricing(db: AsyncSession, payload: PricingBulkApplyIn):
    normalized_ids = sorted(set(int(pid) for pid in payload.product_ids))
    category = (payload.category or "").strip()

    stmt = select(Product)
    if normalized_ids:
        stmt = stmt.where(Product.id.in_(normalized_ids))
        scope = f"product_ids:{len(normalized_ids)}"
    elif category:
        stmt = stmt.where(Product.category == category)
        scope = f"category:{category}"
    else:
        scope = "all_products"
    stmt = stmt.order_by(Product.id.asc())

    result = await db.execute(stmt)
    products = result.scalars().all()
    if not products:
        raise HTTPException(status_code=404, detail="No hay productos para actualizar")

    rows: list[dict] = []
    for product in products:
        qty = max(int(product.cost_qty or 1), 1)
        stored_cost_total = _to_decimal(product.cost_total or 0, "cost_total")
        if stored_cost_total <= 0:
            fallback_unit_cost = _to_decimal(
                product.unit_cost or product.cost or 0, "unit_cost"
            )
            stored_cost_total = _quantize_money(fallback_unit_cost * Decimal(qty))

        direct_breakdown = _parse_breakdown_json(product.direct_costs_breakdown)
        preview = preview_pricing(
            cost_total=stored_cost_total,
            qty=qty,
            direct_costs_breakdown=direct_breakdown,
            desired_margin=payload.desired_margin,
        )

        old_sale_price = float(product.sale_price or product.price or 0)
        old_margin = float(product.desired_margin or 0)

        product.cost_total = _quantize_money(stored_cost_total)
        product.cost_qty = preview.qty
        product.direct_costs_breakdown = json.dumps(
            {
                key: float(_quantize_money(value))
                for key, value in preview.direct_costs_breakdown.items()
            },
            ensure_ascii=False,
        )
        product.direct_costs_total = preview.direct_costs_total
        product.desired_margin = preview.desired_margin
        product.unit_cost = preview.unit_cost
        product.cost = float(preview.unit_cost)
        product.sale_price = preview.sale_price_unit
        product.price = float(preview.sale_price_unit)

        rows.append(
            {
                "product_id": product.id,
                "sku": product.sku,
                "name": product.name,
                "old_sale_price": old_sale_price,
                "new_sale_price": float(preview.sale_price_unit),
                "old_margin": old_margin,
                "new_margin": float(preview.desired_margin),
                "unit_cost": float(preview.unit_cost),
                "profit_unit": float(preview.profit_unit),
            }
        )

    await db.flush()
    return {
        "updated_count": len(rows),
        "desired_margin": float(payload.desired_margin),
        "scope": scope,
        "items": rows,
    }
