"""phase17 real lot costing, bulk pricing support and profitability fields

Revision ID: 0019_phase17
Revises: 0018_phase16
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa

revision = "0019_phase17"
down_revision = "0018_phase16"
branch_labels = None
depends_on = None


def _columns_for(table_name: str) -> set[str]:
    conn = op.get_bind()
    if conn.dialect.name == "sqlite":
        rows = conn.execute(sa.text(f"PRAGMA table_info({table_name})")).fetchall()
        return {row[1] for row in rows}
    rows = conn.execute(
        sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = :table_name"),
        {"table_name": table_name},
    )
    return {row[0] for row in rows}


def upgrade() -> None:
    purchase_columns = _columns_for("purchases")
    if "subtotal" not in purchase_columns:
        op.add_column("purchases", sa.Column("subtotal", sa.Numeric(14, 4), nullable=False, server_default="0"))
    if "direct_costs_breakdown" not in purchase_columns:
        op.add_column(
            "purchases",
            sa.Column("direct_costs_breakdown", sa.Text(), nullable=False, server_default="{}"),
        )
    if "direct_costs_total" not in purchase_columns:
        op.add_column(
            "purchases",
            sa.Column("direct_costs_total", sa.Numeric(14, 4), nullable=False, server_default="0"),
        )

    purchase_item_columns = _columns_for("purchase_items")
    if "base_unit_cost" not in purchase_item_columns:
        op.add_column(
            "purchase_items",
            sa.Column("base_unit_cost", sa.Numeric(14, 4), nullable=False, server_default="0"),
        )
    if "direct_cost_allocated" not in purchase_item_columns:
        op.add_column(
            "purchase_items",
            sa.Column("direct_cost_allocated", sa.Numeric(14, 4), nullable=False, server_default="0"),
        )

    batch_columns = _columns_for("stock_batches")
    if "unit_cost" not in batch_columns:
        op.add_column("stock_batches", sa.Column("unit_cost", sa.Numeric(14, 4), nullable=False, server_default="0"))
    if "direct_cost_allocated" not in batch_columns:
        op.add_column(
            "stock_batches",
            sa.Column("direct_cost_allocated", sa.Numeric(14, 4), nullable=False, server_default="0"),
        )
    if "source_type" not in batch_columns:
        op.add_column("stock_batches", sa.Column("source_type", sa.String(length=30), nullable=False, server_default=""))
    if "source_ref" not in batch_columns:
        op.add_column("stock_batches", sa.Column("source_ref", sa.String(length=50), nullable=False, server_default=""))

    sale_item_columns = _columns_for("sale_items")
    if "unit_cost_snapshot" not in sale_item_columns:
        op.add_column("sale_items", sa.Column("unit_cost_snapshot", sa.Float(), nullable=False, server_default="0"))

    op.execute(sa.text("UPDATE purchases SET subtotal = COALESCE(subtotal, COALESCE(total, 0))"))
    op.execute(sa.text("UPDATE purchases SET direct_costs_total = COALESCE(direct_costs_total, 0)"))
    op.execute(sa.text("UPDATE purchases SET direct_costs_breakdown = COALESCE(NULLIF(direct_costs_breakdown, ''), '{}')"))
    op.execute(sa.text("UPDATE purchase_items SET base_unit_cost = COALESCE(base_unit_cost, COALESCE(unit_cost, 0))"))
    op.execute(sa.text("UPDATE purchase_items SET direct_cost_allocated = COALESCE(direct_cost_allocated, 0)"))
    op.execute(sa.text("UPDATE stock_batches SET unit_cost = COALESCE(unit_cost, 0)"))
    op.execute(sa.text("UPDATE stock_batches SET direct_cost_allocated = COALESCE(direct_cost_allocated, 0)"))
    op.execute(sa.text("UPDATE stock_batches SET source_type = COALESCE(source_type, '')"))
    op.execute(sa.text("UPDATE stock_batches SET source_ref = COALESCE(source_ref, '')"))
    op.execute(
        sa.text(
            "UPDATE sale_items "
            "SET unit_cost_snapshot = COALESCE("
            "(SELECT COALESCE(products.unit_cost, products.cost, 0) FROM products WHERE products.id = sale_items.product_id), "
            "0)"
        )
    )

    with op.batch_alter_table("purchases") as batch_op:
        batch_op.alter_column("subtotal", server_default=None)
        batch_op.alter_column("direct_costs_breakdown", server_default=None)
        batch_op.alter_column("direct_costs_total", server_default=None)
    with op.batch_alter_table("purchase_items") as batch_op:
        batch_op.alter_column("base_unit_cost", server_default=None)
        batch_op.alter_column("direct_cost_allocated", server_default=None)
    with op.batch_alter_table("stock_batches") as batch_op:
        batch_op.alter_column("unit_cost", server_default=None)
        batch_op.alter_column("direct_cost_allocated", server_default=None)
        batch_op.alter_column("source_type", server_default=None)
        batch_op.alter_column("source_ref", server_default=None)
    with op.batch_alter_table("sale_items") as batch_op:
        batch_op.alter_column("unit_cost_snapshot", server_default=None)


def downgrade() -> None:
    sale_item_columns = _columns_for("sale_items")
    if "unit_cost_snapshot" in sale_item_columns:
        op.drop_column("sale_items", "unit_cost_snapshot")

    batch_columns = _columns_for("stock_batches")
    if "source_ref" in batch_columns:
        op.drop_column("stock_batches", "source_ref")
    if "source_type" in batch_columns:
        op.drop_column("stock_batches", "source_type")
    if "direct_cost_allocated" in batch_columns:
        op.drop_column("stock_batches", "direct_cost_allocated")
    if "unit_cost" in batch_columns:
        op.drop_column("stock_batches", "unit_cost")

    purchase_item_columns = _columns_for("purchase_items")
    if "direct_cost_allocated" in purchase_item_columns:
        op.drop_column("purchase_items", "direct_cost_allocated")
    if "base_unit_cost" in purchase_item_columns:
        op.drop_column("purchase_items", "base_unit_cost")

    purchase_columns = _columns_for("purchases")
    if "direct_costs_total" in purchase_columns:
        op.drop_column("purchases", "direct_costs_total")
    if "direct_costs_breakdown" in purchase_columns:
        op.drop_column("purchases", "direct_costs_breakdown")
    if "subtotal" in purchase_columns:
        op.drop_column("purchases", "subtotal")
