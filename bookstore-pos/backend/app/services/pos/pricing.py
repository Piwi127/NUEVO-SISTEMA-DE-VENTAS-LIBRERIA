from dataclasses import dataclass
from typing import Literal

RuleType = Literal["BUNDLE_PRICE", "UNIT_PRICE_BY_QTY"]


@dataclass(frozen=True)
class BundleRuleInput:
    id: int
    name: str
    bundle_qty: int
    bundle_price: float


@dataclass(frozen=True)
class ProductRuleInput:
    id: int
    name: str
    rule_type: RuleType
    bundle_qty: int | None = None
    bundle_price: float | None = None
    min_qty: int | None = None
    unit_price: float | None = None
    priority: int = 0


@dataclass(frozen=True)
class BundlePricingResult:
    discount: float
    bundles_applied: int
    applied_rule: BundleRuleInput | None


@dataclass(frozen=True)
class ProductRulePricingResult:
    discount: float
    bundles_applied: int
    applied_rule: ProductRuleInput | None


@dataclass(frozen=True)
class CartLineInput:
    product_id: int
    quantity: int
    original_unit_price: float


@dataclass(frozen=True)
class AppliedPromotionLine:
    product_id: int
    quantity: int
    original_unit_price: float
    final_unit_price: float
    promotion_applied: bool
    promotion_name: str | None
    line_subtotal: float
    discount: float
    applied_rule_id: int | None
    applied_rule_type: RuleType | None
    bundles_applied: int = 0


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


def calculate_unit_price_by_qty_discount(qty: int, unit_price: float, min_qty: int, promo_unit_price: float) -> float:
    if qty <= 0 or unit_price <= 0 or min_qty <= 0 or promo_unit_price <= 0:
        return 0.0
    if qty < min_qty:
        return 0.0

    raw_unit_discount = unit_price - promo_unit_price
    if raw_unit_discount <= 0:
        return 0.0

    line_total = unit_price * qty
    discount = qty * raw_unit_discount
    discount = max(0.0, min(discount, line_total))
    return float(discount)


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


def _rule_specificity(rule: ProductRuleInput | None) -> int:
    if not rule:
        return -1
    if rule.rule_type == "UNIT_PRICE_BY_QTY":
        return int(rule.min_qty or 0)
    return int(rule.bundle_qty or 0)


def _rule_priority(rule: ProductRuleInput | None) -> tuple[int, int, int]:
    if not rule:
        return -1, -1, -1
    type_priority = 1 if rule.rule_type == "UNIT_PRICE_BY_QTY" else 0
    return int(rule.priority or 0), _rule_specificity(rule), type_priority


def select_best_product_rule(qty: int, unit_price: float, rules: list[ProductRuleInput]) -> ProductRulePricingResult:
    best_rule: ProductRuleInput | None = None
    best_discount = 0.0
    best_bundles = 0

    for rule in rules:
        discount = 0.0
        bundles_applied = 0
        if rule.rule_type == "BUNDLE_PRICE" and rule.bundle_qty and rule.bundle_price:
            discount, bundles_applied = calculate_bundle_discount(qty, unit_price, rule.bundle_qty, rule.bundle_price)
        elif rule.rule_type == "UNIT_PRICE_BY_QTY" and rule.min_qty and rule.unit_price:
            discount = calculate_unit_price_by_qty_discount(qty, unit_price, rule.min_qty, rule.unit_price)

        if discount > best_discount:
            best_discount = discount
            best_bundles = bundles_applied
            best_rule = rule
        elif discount == best_discount and discount > 0 and _rule_priority(rule) > _rule_priority(best_rule):
            best_bundles = bundles_applied
            best_rule = rule

    return ProductRulePricingResult(discount=float(best_discount), bundles_applied=best_bundles, applied_rule=best_rule)


def apply_product_promotions(
    cart_items: list[CartLineInput],
    rules_by_product: dict[int, list[ProductRuleInput]],
) -> list[AppliedPromotionLine]:
    lines: list[AppliedPromotionLine] = []
    for item in cart_items:
        qty = max(0, int(item.quantity))
        base_price = max(0.0, float(item.original_unit_price))
        base_total = base_price * qty

        result = select_best_product_rule(qty, base_price, rules_by_product.get(item.product_id, []))
        discount = max(0.0, min(base_total, float(result.discount)))
        line_subtotal = base_total - discount
        final_unit_price = (line_subtotal / qty) if qty > 0 else 0.0

        applied_rule = result.applied_rule if discount > 0 else None
        lines.append(
            AppliedPromotionLine(
                product_id=item.product_id,
                quantity=qty,
                original_unit_price=base_price,
                final_unit_price=float(final_unit_price),
                promotion_applied=applied_rule is not None,
                promotion_name=applied_rule.name if applied_rule else None,
                line_subtotal=float(line_subtotal),
                discount=float(discount),
                applied_rule_id=applied_rule.id if applied_rule else None,
                applied_rule_type=applied_rule.rule_type if applied_rule else None,
                bundles_applied=result.bundles_applied if applied_rule and applied_rule.rule_type == "BUNDLE_PRICE" else 0,
            )
        )
    return lines
