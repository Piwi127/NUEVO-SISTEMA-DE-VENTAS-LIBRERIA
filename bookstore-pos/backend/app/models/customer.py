from sqlalchemy import Integer, String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    tax_id: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    price_list_id: Mapped[int | None] = mapped_column(ForeignKey("price_lists.id"), nullable=True)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0)
    loyalty_total_earned: Mapped[int] = mapped_column(Integer, default=0)
    loyalty_total_redeemed: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        Index("ix_customers_name_email", "name", "email"),
    )
