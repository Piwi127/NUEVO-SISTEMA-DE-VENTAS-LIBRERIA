from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    opening_amount: Mapped[float] = mapped_column(Numeric(14, 4))
    is_open: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class CashMovement(Base):
    __tablename__ = "cash_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cash_session_id: Mapped[int] = mapped_column(ForeignKey("cash_sessions.id"), index=True)
    type: Mapped[str] = mapped_column(String(10), index=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 4))
    reason: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class CashAudit(Base):
    __tablename__ = "cash_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cash_session_id: Mapped[int] = mapped_column(ForeignKey("cash_sessions.id"), index=True)
    type: Mapped[str] = mapped_column(String(2), index=True)  # X / Z
    expected_amount: Mapped[float] = mapped_column(Numeric(14, 4))
    counted_amount: Mapped[float] = mapped_column(Numeric(14, 4))
    difference: Mapped[float] = mapped_column(Numeric(14, 4))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
