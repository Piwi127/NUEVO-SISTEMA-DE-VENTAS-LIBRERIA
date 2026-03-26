"""
Modelos de ventas del sistema POS.

Contiene:
- Sale: Una venta completada con totales, descuentos y documento
- SaleItem: Línea de item dentro de una venta
- Payment: Método de pago utilizado en una venta
"""

from datetime import datetime, timezone
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Boolean,
    Text,
    Numeric,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Sale(Base):
    """
    Modelo de venta completada.

    Representa una transacción de venta con:
    - Información del usuario que realizó la venta
    - Cliente asociado (opcional)
    - Promociones y descuentos aplicados
    - Sistema de puntos de_lealtad
    - Documento generado (ticket/boleta/factura)
    - Estado de la venta

    Atributos:
        id: Identificador único
        user_id: ID del usuario/cajero que realizó la venta
        customer_id: ID del cliente (nullable)
        promotion_id: ID de promoción aplicada
        price_list_id: ID de lista de precios usada
        status: Estado (PAID, VOIDED, etc.)
        subtotal: Subtotal antes de impuestos y descuentos
        tax: Monto de impuesto
        discount: Descuento total
        pack_discount: Descuento por packs/promociones
        promotion_discount: Descuento por promoción global
        loyalty_discount: Descuento por redención de puntos
        loyalty_points_earned: Puntos ganados en la compra
        loyalty_points_redeemed: Puntos canjeados
        total: Total final a pagar
        tax_rate: Tasa de impuesto aplicada
        tax_included: Si el precio incluye impuesto
        invoice_number: Número de documento generado
        document_type: Tipo de documento (TICKET, BOLETA, FACTURA)
        created_at: Fecha y hora de creación
    """

    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id"), nullable=True, index=True
    )
    promotion_id: Mapped[int | None] = mapped_column(
        ForeignKey("promotions.id"), nullable=True
    )
    price_list_id: Mapped[int | None] = mapped_column(
        ForeignKey("price_lists.id"), nullable=True
    )
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index(
            "ix_sales_created_at_desc",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
        Index("ix_sales_user_status", "user_id", "status"),
    )


class SaleItem(Base):
    """
    Línea de item dentro de una venta.

    Representa un producto específico incluido en una venta
    con su precio, cantidad y descuentos aplicados.

    Atributos:
        id: Identificador único
        sale_id: ID de la venta padre
        product_id: ID del producto
        qty: Cantidad vendida
        unit_price: Precio unitario al momento de la venta
        unit_cost_snapshot: Costo unitario al momento de la venta
        line_total: Total de la línea (precio * cantidad)
        discount: Descuento aplicado a la línea
        final_total: Total final de la línea
        applied_rule_id: ID de regla de promoción aplicada
        applied_rule_meta: Metadatos de la regla aplicada (JSON)
    """

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
    applied_rule_id: Mapped[int | None] = mapped_column(
        ForeignKey("promotion_rules.id"), nullable=True
    )
    applied_rule_meta: Mapped[str | None] = mapped_column(Text, nullable=True)

    sale: Mapped[Sale] = relationship(back_populates="items")


class Payment(Base):
    """
    Registro de pago en una venta.

    Representa un método de pago utilizado para pagar una venta.
    Una venta puede tener múltiples pagos (ej: efectivo + tarjeta).

    Atributos:
        id: Identificador único
        sale_id: ID de la venta
        method: Método de pago (CASH, CARD, etc.)
        amount: Monto pagado con este método
    """

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), index=True)
    method: Mapped[str] = mapped_column(String(20), index=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 4))

    sale: Mapped[Sale] = relationship(back_populates="payments")
