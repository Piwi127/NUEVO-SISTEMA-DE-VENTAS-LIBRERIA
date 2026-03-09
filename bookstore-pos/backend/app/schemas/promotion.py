from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class PromotionBase(BaseModel):
    name: str
    type: str = "PERCENT"
    value: float = 0.0
    is_active: bool = True


class PromotionCreate(PromotionBase):
    pass


class PromotionUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    value: float | None = None
    is_active: bool | None = None


class PromotionOut(PromotionBase):
    id: int
    model_config = {"from_attributes": True}


RuleType = Literal["BUNDLE_PRICE", "UNIT_PRICE_BY_QTY"]


class PromotionRuleBase(BaseModel):
    name: str
    product_id: int
    rule_type: RuleType = "BUNDLE_PRICE"
    bundle_qty: int | None = Field(default=None, ge=2)
    bundle_price: float | None = Field(default=None, gt=0)
    min_qty: int | None = Field(default=None, ge=2)
    unit_price: float | None = Field(default=None, gt=0)
    priority: int = 0
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_rule_fields(self):
        if self.rule_type == "BUNDLE_PRICE":
            if self.bundle_qty is None or self.bundle_price is None:
                raise ValueError("bundle_qty y bundle_price son requeridos para reglas BUNDLE_PRICE")
            if self.min_qty is not None or self.unit_price is not None:
                raise ValueError("min_qty y unit_price no aplican a reglas BUNDLE_PRICE")
        elif self.rule_type == "UNIT_PRICE_BY_QTY":
            if self.min_qty is None or self.unit_price is None:
                raise ValueError("min_qty y unit_price son requeridos para reglas UNIT_PRICE_BY_QTY")
            if self.bundle_qty is not None or self.bundle_price is not None:
                raise ValueError("bundle_qty y bundle_price no aplican a reglas UNIT_PRICE_BY_QTY")
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date no puede ser menor que start_date")
        return self


class PromotionRuleCreate(PromotionRuleBase):
    pass


class PromotionRuleUpdate(BaseModel):
    name: str | None = None
    product_id: int | None = None
    rule_type: RuleType | None = None
    bundle_qty: int | None = Field(default=None, ge=2)
    bundle_price: float | None = Field(default=None, gt=0)
    min_qty: int | None = Field(default=None, ge=2)
    unit_price: float | None = Field(default=None, gt=0)
    priority: int | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date no puede ser menor que start_date")
        return self


class PromotionRuleOut(PromotionRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}
