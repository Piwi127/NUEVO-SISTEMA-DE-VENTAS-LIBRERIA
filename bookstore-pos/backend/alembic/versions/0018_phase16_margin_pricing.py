"""phase16 add margin pricing fields to products

Revision ID: 0018_phase16
Revises: 0017_phase15
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa

revision = "0018_phase16"
down_revision = "0017_phase15"
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
    product_columns = _columns_for("products")

    if "sale_price" not in product_columns:
        op.add_column("products", sa.Column("sale_price", sa.Numeric(14, 4), nullable=False, server_default="0"))
    if "cost_total" not in product_columns:
        op.add_column("products", sa.Column("cost_total", sa.Numeric(14, 4), nullable=False, server_default="0"))
    if "cost_qty" not in product_columns:
        op.add_column("products", sa.Column("cost_qty", sa.Integer(), nullable=False, server_default="1"))
    if "direct_costs_breakdown" not in product_columns:
        op.add_column("products", sa.Column("direct_costs_breakdown", sa.Text(), nullable=False, server_default="{}"))
    if "direct_costs_total" not in product_columns:
        op.add_column("products", sa.Column("direct_costs_total", sa.Numeric(14, 4), nullable=False, server_default="0"))
    if "desired_margin" not in product_columns:
        op.add_column("products", sa.Column("desired_margin", sa.Numeric(8, 6), nullable=False, server_default="0"))
    if "unit_cost" not in product_columns:
        op.add_column("products", sa.Column("unit_cost", sa.Numeric(14, 4), nullable=False, server_default="0"))

    op.execute(sa.text("UPDATE products SET sale_price = COALESCE(price, 0)"))
    op.execute(sa.text("UPDATE products SET unit_cost = COALESCE(cost, 0)"))
    op.execute(sa.text("UPDATE products SET cost_qty = CASE WHEN cost_qty <= 0 THEN 1 ELSE cost_qty END"))
    op.execute(sa.text("UPDATE products SET cost_total = COALESCE(cost_total, COALESCE(cost, 0) * cost_qty)"))
    op.execute(sa.text("UPDATE products SET direct_costs_total = COALESCE(direct_costs_total, 0)"))
    op.execute(sa.text("UPDATE products SET desired_margin = COALESCE(desired_margin, 0)"))
    op.execute(sa.text("UPDATE products SET direct_costs_breakdown = COALESCE(NULLIF(direct_costs_breakdown, ''), '{}')"))

    with op.batch_alter_table("products") as batch_op:
        batch_op.alter_column("sale_price", server_default=None)
        batch_op.alter_column("cost_total", server_default=None)
        batch_op.alter_column("cost_qty", server_default=None)
        batch_op.alter_column("direct_costs_breakdown", server_default=None)
        batch_op.alter_column("direct_costs_total", server_default=None)
        batch_op.alter_column("desired_margin", server_default=None)
        batch_op.alter_column("unit_cost", server_default=None)


def downgrade() -> None:
    product_columns = _columns_for("products")
    if "unit_cost" in product_columns:
        op.drop_column("products", "unit_cost")
    if "desired_margin" in product_columns:
        op.drop_column("products", "desired_margin")
    if "direct_costs_total" in product_columns:
        op.drop_column("products", "direct_costs_total")
    if "direct_costs_breakdown" in product_columns:
        op.drop_column("products", "direct_costs_breakdown")
    if "cost_qty" in product_columns:
        op.drop_column("products", "cost_qty")
    if "cost_total" in product_columns:
        op.drop_column("products", "cost_total")
    if "sale_price" in product_columns:
        op.drop_column("products", "sale_price")
