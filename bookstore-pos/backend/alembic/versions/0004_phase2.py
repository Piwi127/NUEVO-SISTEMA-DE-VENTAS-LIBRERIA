"""phase2 warehouses

Revision ID: 0004_phase2
Revises: 0003_phase1
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_phase2"
down_revision = "0003_phase1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "warehouses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("location", sa.String(length=100), nullable=False, server_default=""),
    )
    op.create_index("ix_warehouses_name", "warehouses", ["name"], unique=True)

    op.create_table(
        "stock_levels",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("qty", sa.Integer, nullable=False, server_default=sa.text("0")),
    )

    op.create_table(
        "stock_batches",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("lot", sa.String(length=50), nullable=False),
        sa.Column("expiry_date", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("qty", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "stock_transfers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("from_warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("to_warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="DONE"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "stock_transfer_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("transfer_id", sa.Integer, sa.ForeignKey("stock_transfers.id"), nullable=False),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
        sa.Column("qty", sa.Integer, nullable=False),
    )

    op.create_table(
        "inventory_counts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
        sa.Column("counted_qty", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("inventory_counts")
    op.drop_table("stock_transfer_items")
    op.drop_table("stock_transfers")
    op.drop_table("stock_batches")
    op.drop_table("stock_levels")
    op.drop_index("ix_warehouses_name", table_name="warehouses")
    op.drop_table("warehouses")
