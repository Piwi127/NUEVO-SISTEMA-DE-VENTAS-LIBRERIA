from dataclasses import dataclass


@dataclass(frozen=True)
class BundleRuleInput:
    id: int
    name: str
    bundle_qty: int
    bundle_price: float


@dataclass(frozen=True)
class BundlePricingResult:
    discount: float
    bundles_applied: int
    applied_rule: BundleRuleInput | None


def calculate_bundle_discount(qty: int, unit_price: float, bundle_qty: int, bundle_price: float) -> tuple[float, int]:
    if qty <= 0 or unit_price <= 0 or bundle_qty <= 0 or bundle_price <= 0:
        return 0.0, 0

    bundles = qty // bundle_qty
    if bundles <= 0:
        return 0.0, 0

    regular_bundle_total = unit_price * bundle_qty
    raw_bundle_discount = regular_bundle_total - bundle_price
    if raw_bundle_discount <= 0:
        return 0.0, 0

    line_total = unit_price * qty
    discount = bundles * raw_bundle_discount
    discount = max(0.0, min(discount, line_total))
    return float(discount), bundles


def select_best_bundle_rule(qty: int, unit_price: float, rules: list[BundleRuleInput]) -> BundlePricingResult:
    best_rule: BundleRuleInput | None = None
    best_discount = 0.0
    best_bundles = 0

    for rule in rules:
        discount, bundles = calculate_bundle_discount(qty, unit_price, rule.bundle_qty, rule.bundle_price)
        if discount > best_discount:
            best_discount = discount
            best_bundles = bundles
            best_rule = rule

    return BundlePricingResult(discount=float(best_discount), bundles_applied=best_bundles, applied_rule=best_rule)
