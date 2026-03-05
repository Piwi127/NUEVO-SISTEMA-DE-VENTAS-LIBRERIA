from app.services.pos.pricing import BundleRuleInput, select_best_bundle_rule


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
