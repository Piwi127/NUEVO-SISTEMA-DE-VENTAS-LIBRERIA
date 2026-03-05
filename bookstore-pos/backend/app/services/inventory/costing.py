from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

MONEY_QUANT = Decimal("0.01")


def to_decimal(value, field_name: str) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise ValueError(f"{field_name} invalido") from None


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def normalize_direct_costs(raw_breakdown: dict[str, float | str | Decimal] | None) -> tuple[dict[str, Decimal], Decimal]:
    normalized: dict[str, Decimal] = {}
    total = Decimal("0")
    for key, raw_value in (raw_breakdown or {}).items():
        amount = to_decimal(raw_value, f"direct_costs_breakdown.{key}")
        if amount < 0:
            raise ValueError(f"direct_costs_breakdown.{key} no puede ser negativo")
        normalized[key] = quantize_money(amount)
        total += amount
    return normalized, quantize_money(total)


def allocate_direct_costs(line_subtotals: list[Decimal], direct_costs_total: Decimal) -> list[Decimal]:
    if not line_subtotals:
        return []
    total = quantize_money(direct_costs_total)
    if total <= 0:
        return [Decimal("0")] * len(line_subtotals)

    subtotal_sum = sum(line_subtotals, Decimal("0"))
    if subtotal_sum <= 0:
        even = quantize_money(total / Decimal(len(line_subtotals)))
        allocations = [even] * len(line_subtotals)
        remainder = total - sum(allocations, Decimal("0"))
        allocations[-1] += remainder
        return allocations

    allocations: list[Decimal] = []
    allocated = Decimal("0")
    for index, line_subtotal in enumerate(line_subtotals):
        if index == len(line_subtotals) - 1:
            amount = total - allocated
        else:
            ratio = line_subtotal / subtotal_sum
            amount = quantize_money(total * ratio)
            allocated += amount
        allocations.append(amount)
    return allocations


def weighted_unit_cost(current_stock: int, current_unit_cost: Decimal, incoming_qty: int, incoming_unit_cost: Decimal) -> Decimal:
    if incoming_qty <= 0:
        return quantize_money(current_unit_cost)
    if current_stock <= 0:
        return quantize_money(incoming_unit_cost)
    total_units = Decimal(current_stock + incoming_qty)
    weighted_total = (Decimal(current_stock) * current_unit_cost) + (Decimal(incoming_qty) * incoming_unit_cost)
    return quantize_money(weighted_total / total_units)
