from decimal import Decimal

import pytest

from app.services.catalog.pricing_service import preview_pricing


def test_preview_pricing_matches_excel_formula_with_rounding():
    result = preview_pricing(
        cost_total=Decimal("165"),
        qty=50,
        direct_costs_breakdown={"transport": Decimal("1.5")},
        desired_margin=Decimal("0.35"),
    )

    assert result.cost_total_all == Decimal("166.50")
    assert result.unit_cost == Decimal("3.33")
    assert result.sale_price_unit == Decimal("5.12")
    assert result.profit_unit == Decimal("1.79")


def test_preview_pricing_accepts_margin_limits_zero_and_099():
    zero_margin = preview_pricing(
        cost_total=Decimal("165"),
        qty=50,
        direct_costs_breakdown={"transport": Decimal("1.5")},
        desired_margin=Decimal("0"),
    )
    assert zero_margin.sale_price_unit == Decimal("3.33")

    high_margin = preview_pricing(
        cost_total=Decimal("165"),
        qty=50,
        direct_costs_breakdown={"transport": Decimal("1.5")},
        desired_margin=Decimal("0.99"),
    )
    assert high_margin.sale_price_unit == Decimal("333.00")


def test_preview_pricing_rejects_invalid_qty():
    with pytest.raises(ValueError, match="qty debe ser mayor que 0"):
        preview_pricing(
            cost_total=Decimal("165"),
            qty=0,
            direct_costs_breakdown={"transport": Decimal("1.5")},
            desired_margin=Decimal("0.35"),
        )
