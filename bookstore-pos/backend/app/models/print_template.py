from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PrintTemplate(Base):
    __tablename__ = "print_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    document_type: Mapped[str] = mapped_column(String(20), index=True)
    paper_code: Mapped[str] = mapped_column(String(30), default="THERMAL_80")
    paper_width_mm: Mapped[float] = mapped_column(Float, default=80.0)
    paper_height_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    margin_top_mm: Mapped[float] = mapped_column(Float, default=2.0)
    margin_right_mm: Mapped[float] = mapped_column(Float, default=2.0)
    margin_bottom_mm: Mapped[float] = mapped_column(Float, default=2.0)
    margin_left_mm: Mapped[float] = mapped_column(Float, default=2.0)
    scope_type: Mapped[str] = mapped_column(String(20), default="GLOBAL")
    scope_ref_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    versions: Mapped[list["PrintTemplateVersion"]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
    )


class PrintTemplateVersion(Base):
    __tablename__ = "print_template_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("print_templates.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    schema_json: Mapped[str] = mapped_column(Text)
    checksum: Mapped[str] = mapped_column(String(64), default="")
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    template: Mapped[PrintTemplate] = relationship(back_populates="versions")
