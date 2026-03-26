"""
Modelos de listas de precios.
Contiene clases para gestionar precios por cliente.
"""

from sqlalchemy import Integer, String, ForeignKey, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PriceList(Base):
    """Lista de precios personalizada para clientes."""

    __tablename__ = "price_lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class PriceListItem(Base):
    """Precio específico de un producto en una lista."""

    __tablename__ = "price_list_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    price_list_id: Mapped[int] = mapped_column(ForeignKey("price_lists.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    price: Mapped[float] = mapped_column(Numeric(14, 4))

    __table_args__ = (
        Index("ix_price_list_items_product_price", "product_id", "price"),
    )
