"""
Modelos de almacenes y gestión de stock.
Contiene clases para almacenes, niveles, lotes, transferencias e inventarios.
"""

from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Warehouse(Base):
    """Almacén o ubicación física de inventario."""

    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    location: Mapped[str] = mapped_column(String(100), default="")


class StockLevel(Base):
    """Nivel de stock de un producto en un almacén."""

    __tablename__ = "stock_levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"))
    qty: Mapped[int] = mapped_column(Integer, default=0)


class StockBatch(Base):
    """Lote de inventario con costo y fecha de vencimiento."""

    __tablename__ = "stock_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"))
    lot: Mapped[str] = mapped_column(String(50))
    expiry_date: Mapped[str] = mapped_column(String(20), default="")
    qty: Mapped[int] = mapped_column(Integer, default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    direct_cost_allocated: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    source_type: Mapped[str] = mapped_column(String(30), default="")
    source_ref: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class StockTransfer(Base):
    """Transferencia de stock entre almacenes."""

    __tablename__ = "stock_transfers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    from_warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"))
    to_warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"))
    status: Mapped[str] = mapped_column(String(20), default="DONE")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class StockTransferItem(Base):
    """Ítem individual en una transferencia de stock."""

    __tablename__ = "stock_transfer_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transfer_id: Mapped[int] = mapped_column(ForeignKey("stock_transfers.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    qty: Mapped[int] = mapped_column(Integer)


class InventoryCount(Base):
    """Conteo físico de inventario."""

    __tablename__ = "inventory_counts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    counted_qty: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
