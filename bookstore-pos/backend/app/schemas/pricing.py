from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class PricingPreviewIn(BaseModel):
    cost_total: Decimal
    qty: int = Field(gt=0)
    direct_costs_breakdown: dict[str, Decimal] = Field(default_factory=dict)
    desired_margin: Decimal

    @field_validator("cost_total")
    @classmethod
    def validate_cost_total(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError("cost_total debe ser mayor o igual a 0")
        return value

    @field_validator("desired_margin")
    @classmethod
    def validate_desired_margin(cls, value: Decimal) -> Decimal:
        if value < 0 or value >= 1:
            raise ValueError("desired_margin debe estar entre 0 y menor que 1")
        return value

    @field_validator("direct_costs_breakdown")
    @classmethod
    def validate_breakdown(cls, value: dict[str, Decimal]) -> dict[str, Decimal]:
        for key, amount in value.items():
            if amount < 0:
                raise ValueError(f"direct_costs_breakdown.{key} no puede ser negativo")
        return value


class PricingPreviewOut(BaseModel):
    qty: int
    desired_margin: float
    direct_costs_total: float
    cost_total_all: float
    unit_cost: float
    sale_price_unit: float
    profit_unit: float


class PricingApplyOut(BaseModel):
    product_id: int
    unit_cost: float
    sale_price: float
    profit_unit: float
    direct_costs_total: float
    cost_total_all: float
