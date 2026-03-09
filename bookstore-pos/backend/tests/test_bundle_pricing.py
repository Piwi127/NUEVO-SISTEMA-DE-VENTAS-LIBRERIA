from app.services.pos.pricing import (
    BundleRuleInput,
    ProductRuleInput,
    calculate_unit_price_by_qty_discount,
    select_best_bundle_rule,
    select_best_product_rule,
)


def test_bundle_pricing_qty_3_applies_one_bundle():
    rule = BundleRuleInput(id=1, name="3x2.50", bundle_qty=3, bundle_price=2.5)
    result = select_best_bundle_rule(qty=3, unit_price=1.0, rules=[rule])
    assert result.bundles_applied == 1
    assert result.discount == 0.5


def test_bundle_pricing_qty_4_applies_one_bundle_plus_one_regular():
    rule = BundleRuleInput(id=1, name="3x2.50", bundle_qty=3, bundle_price=2.5)
    result = select_best_bundle_rule(qty=4, unit_price=1.0, rules=[rule])
    assert result.bundles_applied == 1
    assert result.discount == 0.5


def test_bundle_pricing_qty_6_applies_two_bundles():
    rule = BundleRuleInput(id=1, name="3x2.50", bundle_qty=3, bundle_price=2.5)
    result = select_best_bundle_rule(qty=6, unit_price=1.0, rules=[rule])
    assert result.bundles_applied == 2
    assert result.discount == 1.0


def test_unit_price_by_qty_applies_from_threshold():
    discount = calculate_unit_price_by_qty_discount(qty=3, unit_price=6.5, min_qty=3, promo_unit_price=6.0)
    assert discount == 1.5


def test_best_product_rule_prefers_higher_discount_between_types():
    rules = [
        ProductRuleInput(
            id=1,
            name="Pack 3x18",
            rule_type="BUNDLE_PRICE",
            bundle_qty=3,
            bundle_price=18.0,
        ),
        ProductRuleInput(
            id=2,
            name="Desde 3 a 6.00",
            rule_type="UNIT_PRICE_BY_QTY",
            min_qty=3,
            unit_price=6.0,
        ),
    ]
    result = select_best_product_rule(qty=3, unit_price=6.5, rules=rules)
    assert result.discount == 1.5
    assert result.applied_rule is not None
    assert result.applied_rule.rule_type == "UNIT_PRICE_BY_QTY"


def test_unit_price_tiers_pick_best_threshold():
    rules = [
        ProductRuleInput(
            id=1,
            name="5 unidades",
            rule_type="UNIT_PRICE_BY_QTY",
            min_qty=5,
            unit_price=5.8,
        ),
        ProductRuleInput(
            id=2,
            name="10 unidades",
            rule_type="UNIT_PRICE_BY_QTY",
            min_qty=10,
            unit_price=5.5,
        ),
    ]
    result = select_best_product_rule(qty=10, unit_price=6.5, rules=rules)
    assert result.discount == 10.0
    assert result.applied_rule is not None
    assert result.applied_rule.id == 2
