from pydantic import BaseModel


class SupplierBase(BaseModel):
    name: str
    phone: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class SupplierOut(SupplierBase):
    id: int

    model_config = {"from_attributes": True}
