"""
Modelo de Producto para el sistema POS.

Representa los productos vendidos en la librería con información
de precios, stock, costos y metadatos para búsqueda.
"""

from sqlalchemy import Boolean, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Product(Base):
    """
    Modelo de producto del catálogo.

    Atributos:
        id: Identificador único
        sku: Código SKU único del producto
        name: Nombre del producto
        author: Autor (para libros)
        publisher: Editorial (para libros)
        isbn: ISBN (para libros)
        barcode: Código de barras
        shelf_location: Ubicación en estante
        category: Categoría del producto
        tags: Tags/búsqueda (separados por coma)
        price: Precio base
        cost: Costo unitario
        sale_price: Precio de venta (puede diferir de price)
        cost_total: Costo total del lote
        cost_qty: Cantidad del lote de costo
        direct_costs_breakdown: Desglose de costos directos (JSON)
        direct_costs_total: Total de costos directos
        desired_margin: Margen deseado (para precios automáticos)
        unit_cost: Costo unitario calculado
        stock: Cantidad en stock
        stock_min: Stock mínimo para alertas
        tax_rate: Tasa de impuesto aplicable
        tax_included: Si el precio incluye impuesto
    """

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    author: Mapped[str] = mapped_column(String(160), default="", index=True)
    publisher: Mapped[str] = mapped_column(String(160), default="", index=True)
    isbn: Mapped[str] = mapped_column(String(32), default="", index=True)
    barcode: Mapped[str] = mapped_column(String(80), default="", index=True)
    shelf_location: Mapped[str] = mapped_column(String(80), default="")
    category: Mapped[str] = mapped_column(String(100), default="", index=True)
    tags: Mapped[str] = mapped_column(String(500), default="")
    price: Mapped[float] = mapped_column(Numeric(14, 4))
    cost: Mapped[float] = mapped_column(Numeric(14, 4))
    sale_price: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    cost_total: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    cost_qty: Mapped[int] = mapped_column(Integer, default=1)
    direct_costs_breakdown: Mapped[str] = mapped_column(Text, default="{}")
    direct_costs_total: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    desired_margin: Mapped[float] = mapped_column(Numeric(8, 6), default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0, index=True)
    stock_min: Mapped[int] = mapped_column(Integer, default=0)
    tax_rate: Mapped[float] = mapped_column(Numeric(8, 6), default=0.0)
    tax_included: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        Index("ix_products_category_stock", "category", "stock"),
        Index(
            "ix_products_name_author",
            "name",
            "author",
            postgresql_ops={
                "name": "varchar_pattern_ops",
                "author": "varchar_pattern_ops",
            },
        ),
    )
