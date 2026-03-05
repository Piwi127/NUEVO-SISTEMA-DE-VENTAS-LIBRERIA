from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    subtotal: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    direct_costs_breakdown: Mapped[str] = mapped_column(Text, default="{}")
    direct_costs_total: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    total: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    items: Mapped[list["PurchaseItem"]] = relationship(back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    qty: Mapped[int] = mapped_column(Integer)
    base_unit_cost: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    unit_cost: Mapped[float] = mapped_column(Float)
    direct_cost_allocated: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    line_total: Mapped[float] = mapped_column(Float)

    purchase: Mapped[Purchase] = relationship(back_populates="items")
