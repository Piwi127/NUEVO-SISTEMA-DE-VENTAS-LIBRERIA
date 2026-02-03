from pydantic import BaseModel


class SystemSettingsOut(BaseModel):
    project_name: str
    currency: str
    tax_rate: float
    tax_included: bool
    store_address: str
    store_phone: str
    store_tax_id: str
    logo_url: str
    payment_methods: str
    invoice_prefix: str
    invoice_next: int
    receipt_header: str
    receipt_footer: str
    paper_width_mm: int
    default_warehouse_id: int | None = None


class SystemSettingsUpdate(BaseModel):
    project_name: str
    currency: str
    tax_rate: float
    tax_included: bool
    store_address: str
    store_phone: str
    store_tax_id: str
    logo_url: str
    payment_methods: str
    invoice_prefix: str
    invoice_next: int
    receipt_header: str
    receipt_footer: str
    paper_width_mm: int
    default_warehouse_id: int | None = None
