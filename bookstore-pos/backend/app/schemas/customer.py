from pydantic import BaseModel


class CustomerBase(BaseModel):
    name: str
    phone: str | None = None
    price_list_id: int | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int
    loyalty_points: int = 0
    loyalty_total_earned: int = 0
    loyalty_total_redeemed: int = 0

    model_config = {"from_attributes": True}
