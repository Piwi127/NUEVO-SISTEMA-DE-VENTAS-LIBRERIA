from pydantic import BaseModel


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
