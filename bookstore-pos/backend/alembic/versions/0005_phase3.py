"""phase3 sales returns and pricing

Revision ID: 0005_phase3
Revises: 0004_phase2
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_phase3"
down_revision = "0004_phase2"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)


def _has_table(table: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"), {"t": table}).fetchall()
    return len(rows) > 0


def upgrade() -> None:
    if not _has_column("sales", "invoice_number"):
        op.add_column("sales", sa.Column("invoice_number", sa.String(length=30), nullable=False, server_default=""))

    if not _has_table("price_lists"):
        op.create_table(
            "price_lists",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False),
        )
        op.create_index("ix_price_lists_name", "price_lists", ["name"], unique=True)

    if not _has_column("customers", "price_list_id"):
        with op.batch_alter_table("customers") as batch_op:
            batch_op.add_column(sa.Column("price_list_id", sa.Integer, nullable=True))

    if not _has_table("price_list_items"):
        op.create_table(
            "price_list_items",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("price_list_id", sa.Integer, nullable=False),
            sa.Column("product_id", sa.Integer, nullable=False),
            sa.Column("price", sa.Float, nullable=False),
        )

    if not _has_table("promotions"):
        op.create_table(
            "promotions",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("type", sa.String(length=20), nullable=False),
            sa.Column("value", sa.Float, nullable=False, server_default=sa.text("0")),
            sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime, nullable=False),
        )

    if not _has_table("sale_returns"):
        op.create_table(
            "sale_returns",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("sale_id", sa.Integer, sa.ForeignKey("sales.id"), nullable=False),
            sa.Column("reason", sa.String(length=200), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime, nullable=False),
        )

    if not _has_table("sale_return_items"):
        op.create_table(
            "sale_return_items",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("return_id", sa.Integer, sa.ForeignKey("sale_returns.id"), nullable=False),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
            sa.Column("qty", sa.Integer, nullable=False),
        )


def downgrade() -> None:
    if _has_table("sale_return_items"):
        op.drop_table("sale_return_items")
    if _has_table("sale_returns"):
        op.drop_table("sale_returns")
    if _has_table("promotions"):
        op.drop_table("promotions")
    if _has_table("price_list_items"):
        op.drop_table("price_list_items")
    if _has_column("customers", "price_list_id"):
        with op.batch_alter_table("customers") as batch_op:
            batch_op.drop_column("price_list_id")
    if _has_table("price_lists"):
        op.drop_index("ix_price_lists_name", table_name="price_lists")
        op.drop_table("price_lists")
    if _has_column("sales", "invoice_number"):
        op.drop_column("sales", "invoice_number")
