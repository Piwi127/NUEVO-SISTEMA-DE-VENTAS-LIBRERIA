"""phase4 purchasing

Revision ID: 0006_phase4
Revises: 0005_phase3
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_phase4"
down_revision = "0005_phase3"
branch_labels = None
depends_on = None


def _has_table(table: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"), {"t": table}).fetchall()
    return len(rows) > 0


def upgrade() -> None:
    if not _has_table("purchase_orders"):
        op.create_table(
            "purchase_orders",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("supplier_id", sa.Integer, sa.ForeignKey("suppliers.id"), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="OPEN"),
            sa.Column("total", sa.Float, nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime, nullable=False),
        )
    if not _has_table("purchase_order_items"):
        op.create_table(
            "purchase_order_items",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("purchase_order_id", sa.Integer, sa.ForeignKey("purchase_orders.id"), nullable=False),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
            sa.Column("qty", sa.Integer, nullable=False),
            sa.Column("unit_cost", sa.Float, nullable=False),
            sa.Column("received_qty", sa.Integer, nullable=False, server_default=sa.text("0")),
        )
    if not _has_table("supplier_payments"):
        op.create_table(
            "supplier_payments",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("supplier_id", sa.Integer, sa.ForeignKey("suppliers.id"), nullable=False),
            sa.Column("amount", sa.Float, nullable=False),
            sa.Column("method", sa.String(length=20), nullable=False),
            sa.Column("reference", sa.String(length=100), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime, nullable=False),
        )


def downgrade() -> None:
    op.drop_table("supplier_payments")
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")
