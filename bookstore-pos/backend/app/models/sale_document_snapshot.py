"""
Modelo de instantánea de documento de venta.
Contiene el contenido renderizado de tickets, boletas y facturas.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SaleDocumentSnapshot(Base):
    """Captura del documento renderizado de una venta."""

    __tablename__ = "sale_document_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), index=True)
    document_type: Mapped[str] = mapped_column(String(20), index=True)
    document_number: Mapped[str] = mapped_column(String(40), index=True)
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("print_templates.id"), nullable=True
    )
    template_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("print_template_versions.id"), nullable=True
    )
    render_context_json: Mapped[str] = mapped_column(Text, default="{}")
    render_result_json: Mapped[str] = mapped_column(Text, default="{}")
    rendered_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    rendered_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    printed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
