"""phase8 sales settings integration

Revision ID: 0010_phase8
Revises: 0009_phase7
Create Date: 2026-02-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_phase8"
down_revision = "0009_phase7"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)


def upgrade() -> None:
    if _has_column("system_settings", "default_warehouse_id") is False:
        op.add_column("system_settings", sa.Column("default_warehouse_id", sa.Integer, nullable=True))

    if _has_column("sales", "promotion_id") is False:
        op.add_column("sales", sa.Column("promotion_id", sa.Integer, nullable=True))
    if _has_column("sales", "price_list_id") is False:
        op.add_column("sales", sa.Column("price_list_id", sa.Integer, nullable=True))
    if _has_column("sales", "tax_rate") is False:
        op.add_column("sales", sa.Column("tax_rate", sa.Float, nullable=False, server_default="0"))
    if _has_column("sales", "tax_included") is False:
        op.add_column("sales", sa.Column("tax_included", sa.Boolean, nullable=False, server_default=sa.text("0")))


def downgrade() -> None:
    if _has_column("sales", "tax_included"):
        op.drop_column("sales", "tax_included")
    if _has_column("sales", "tax_rate"):
        op.drop_column("sales", "tax_rate")
    if _has_column("sales", "price_list_id"):
        op.drop_column("sales", "price_list_id")
    if _has_column("sales", "promotion_id"):
        op.drop_column("sales", "promotion_id")
    if _has_column("system_settings", "default_warehouse_id"):
        op.drop_column("system_settings", "default_warehouse_id")
