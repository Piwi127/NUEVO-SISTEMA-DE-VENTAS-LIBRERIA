from datetime import datetime
from pydantic import BaseModel


class CashOpenRequest(BaseModel):
    opening_amount: float


class CashCloseRequest(BaseModel):
    closing_amount: float | None = None


class CashMovementCreate(BaseModel):
    type: str  # IN / OUT
    amount: float
    reason: str


class CashSessionOut(BaseModel):
    id: int
    user_id: int
    opened_at: datetime
    closed_at: datetime | None = None
    opening_amount: float
    is_open: bool

    model_config = {"from_attributes": True}


class CashMovementOut(BaseModel):
    id: int
    cash_session_id: int
    type: str
    amount: float
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CashAuditCreate(BaseModel):
    type: str  # X / Z
    counted_amount: float


class CashAuditOut(BaseModel):
    id: int
    cash_session_id: int
    type: str
    expected_amount: float
    counted_amount: float
    difference: float
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CashSummaryOut(BaseModel):
    opening_amount: float
    movements_in: float
    movements_out: float
    sales_cash: float
    expected_amount: float


class CashAuditValidationOut(BaseModel):
    id: int
    cash_session_id: int
    type: str
    expected_amount: float
    counted_amount: float
    difference: float
    created_by: int
    created_at: datetime
    validated: bool


class CashReportValidationOut(BaseModel):
    movement_count: int
    audit_count: int
    last_audit_type: str | None = None
    last_difference: float | None = None
    is_balanced: bool
    notes: list[str]


class CashSessionReportOut(BaseModel):
    session: CashSessionOut
    summary: CashSummaryOut
    period_start: datetime
    period_end: datetime
    movements: list[CashMovementOut]
    audits: list[CashAuditValidationOut]
    validation: CashReportValidationOut
