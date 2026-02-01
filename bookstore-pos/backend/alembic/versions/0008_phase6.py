"""phase6 receipt templates and escpos

Revision ID: 0008_phase6
Revises: 0007_phase5
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_phase6"
down_revision = "0007_phase5"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)


def upgrade() -> None:
    if not _has_column("system_settings", "receipt_header"):
        op.add_column("system_settings", sa.Column("receipt_header", sa.String(length=500), nullable=False, server_default=""))
    if not _has_column("system_settings", "receipt_footer"):
        op.add_column(
            "system_settings",
            sa.Column("receipt_footer", sa.String(length=500), nullable=False, server_default="Gracias por su compra"),
        )
    if not _has_column("system_settings", "paper_width_mm"):
        op.add_column("system_settings", sa.Column("paper_width_mm", sa.Integer, nullable=False, server_default=sa.text("80")))


def downgrade() -> None:
    if _has_column("system_settings", "paper_width_mm"):
        op.drop_column("system_settings", "paper_width_mm")
    if _has_column("system_settings", "receipt_footer"):
        op.drop_column("system_settings", "receipt_footer")
    if _has_column("system_settings", "receipt_header"):
        op.drop_column("system_settings", "receipt_header")
