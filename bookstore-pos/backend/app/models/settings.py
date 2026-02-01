from sqlalchemy import Float, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_name: Mapped[str] = mapped_column(String(200), default="Bookstore POS")
    currency: Mapped[str] = mapped_column(String(10), default="PEN")
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0)
    tax_included: Mapped[bool] = mapped_column(Boolean, default=False)
    store_address: Mapped[str] = mapped_column(String(255), default="")
    store_phone: Mapped[str] = mapped_column(String(50), default="")
    store_tax_id: Mapped[str] = mapped_column(String(50), default="")
    logo_url: Mapped[str] = mapped_column(String(255), default="")
    payment_methods: Mapped[str] = mapped_column(String(255), default="CASH,CARD,TRANSFER")
    invoice_prefix: Mapped[str] = mapped_column(String(20), default="B001")
    invoice_next: Mapped[int] = mapped_column(Integer, default=1)
    receipt_header: Mapped[str] = mapped_column(String(500), default="")
    receipt_footer: Mapped[str] = mapped_column(String(500), default="Gracias por su compra")
    paper_width_mm: Mapped[int] = mapped_column(Integer, default=80)
