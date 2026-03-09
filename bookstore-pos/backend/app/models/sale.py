from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Boolean, Text, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)
    promotion_id: Mapped[int | None] = mapped_column(ForeignKey("promotions.id"), nullable=True)
    price_list_id: Mapped[int | None] = mapped_column(ForeignKey("price_lists.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PAID", index=True)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 4))
    tax: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    discount: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    pack_discount: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    promotion_discount: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    loyalty_discount: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    loyalty_points_earned: Mapped[int] = mapped_column(Integer, default=0)
    loyalty_points_redeemed: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 4))
    tax_rate: Mapped[float] = mapped_column(Numeric(8, 6), default=0.0)
    tax_included: Mapped[bool] = mapped_column(Boolean, default=False)
    invoice_number: Mapped[str] = mapped_column(String(30), default="", index=True)
    document_type: Mapped[str] = mapped_column(String(20), default="TICKET", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="sale", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sales_created_at_desc", "created_at", postgresql_ops={"created_at": "DESC"}),
        Index("ix_sales_user_status", "user_id", "status"),
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    qty: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 4))
    unit_cost_snapshot: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    line_total: Mapped[float] = mapped_column(Numeric(14, 4))
    discount: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    final_total: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    applied_rule_id: Mapped[int | None] = mapped_column(ForeignKey("promotion_rules.id"), nullable=True)
    applied_rule_meta: Mapped[str | None] = mapped_column(Text, nullable=True)

    sale: Mapped[Sale] = relationship(back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), index=True)
    method: Mapped[str] = mapped_column(String(20), index=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 4))

    sale: Mapped[Sale] = relationship(back_populates="payments")
