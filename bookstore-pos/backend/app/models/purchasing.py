from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", index=True)
    total: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("ix_purchase_orders_supplier_status", "supplier_id", "status"),
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    qty: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[float] = mapped_column(Numeric(14, 4))
    received_qty: Mapped[int] = mapped_column(Integer, default=0)


class SupplierPayment(Base):
    __tablename__ = "supplier_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 4))
    method: Mapped[str] = mapped_column(String(20), index=True)
    reference: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
