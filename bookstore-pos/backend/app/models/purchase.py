from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), index=True)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    direct_costs_breakdown: Mapped[str] = mapped_column(Text, default="{}")
    direct_costs_total: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 4))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    items: Mapped[list["PurchaseItem"]] = relationship(back_populates="purchase", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_purchases_created_at_desc", "created_at", postgresql_ops={"created_at": "DESC"}),
    )


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    qty: Mapped[int] = mapped_column(Integer)
    base_unit_cost: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(14, 4))
    direct_cost_allocated: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    line_total: Mapped[float] = mapped_column(Numeric(14, 4))

    purchase: Mapped[Purchase] = relationship(back_populates="items")
