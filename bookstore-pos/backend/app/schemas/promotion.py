from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PromotionBase(BaseModel):
    name: str
    type: str = "PERCENT"
    value: float = 0.0
    is_active: bool = True


class PromotionCreate(PromotionBase):
    pass


class PromotionOut(PromotionBase):
    id: int
    model_config = {"from_attributes": True}


class PromotionRuleBase(BaseModel):
    name: str
    product_id: int
    rule_type: Literal["BUNDLE_PRICE"] = "BUNDLE_PRICE"
    bundle_qty: int = Field(ge=2)
    bundle_price: float = Field(gt=0)
    is_active: bool = True


class PromotionRuleCreate(PromotionRuleBase):
    pass


class PromotionRuleUpdate(BaseModel):
    name: str | None = None
    product_id: int | None = None
    rule_type: Literal["BUNDLE_PRICE"] | None = None
    bundle_qty: int | None = Field(default=None, ge=2)
    bundle_price: float | None = Field(default=None, gt=0)
    is_active: bool | None = None


class PromotionRuleOut(PromotionRuleBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}
