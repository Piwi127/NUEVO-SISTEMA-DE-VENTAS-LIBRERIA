"""phase22 loyalty points and sale loyalty totals

Revision ID: 0023_phase22
Revises: 0022_phase21
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0023_phase22"
down_revision = "0022_phase21"
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
    customer_columns = _columns_for("customers")
    with op.batch_alter_table("customers") as batch_op:
        if "loyalty_points" not in customer_columns:
            batch_op.add_column(sa.Column("loyalty_points", sa.Integer(), nullable=False, server_default="0"))
        if "loyalty_total_earned" not in customer_columns:
            batch_op.add_column(sa.Column("loyalty_total_earned", sa.Integer(), nullable=False, server_default="0"))
        if "loyalty_total_redeemed" not in customer_columns:
            batch_op.add_column(sa.Column("loyalty_total_redeemed", sa.Integer(), nullable=False, server_default="0"))

    sale_columns = _columns_for("sales")
    with op.batch_alter_table("sales") as batch_op:
        if "loyalty_discount" not in sale_columns:
            batch_op.add_column(sa.Column("loyalty_discount", sa.Float(), nullable=False, server_default="0"))
        if "loyalty_points_earned" not in sale_columns:
            batch_op.add_column(sa.Column("loyalty_points_earned", sa.Integer(), nullable=False, server_default="0"))
        if "loyalty_points_redeemed" not in sale_columns:
            batch_op.add_column(sa.Column("loyalty_points_redeemed", sa.Integer(), nullable=False, server_default="0"))

    with op.batch_alter_table("customers") as batch_op:
        if "loyalty_points" not in customer_columns:
            batch_op.alter_column("loyalty_points", server_default=None)
        if "loyalty_total_earned" not in customer_columns:
            batch_op.alter_column("loyalty_total_earned", server_default=None)
        if "loyalty_total_redeemed" not in customer_columns:
            batch_op.alter_column("loyalty_total_redeemed", server_default=None)

    with op.batch_alter_table("sales") as batch_op:
        if "loyalty_discount" not in sale_columns:
            batch_op.alter_column("loyalty_discount", server_default=None)
        if "loyalty_points_earned" not in sale_columns:
            batch_op.alter_column("loyalty_points_earned", server_default=None)
        if "loyalty_points_redeemed" not in sale_columns:
            batch_op.alter_column("loyalty_points_redeemed", server_default=None)


def downgrade() -> None:
    sale_columns = _columns_for("sales")
    with op.batch_alter_table("sales") as batch_op:
        if "loyalty_points_redeemed" in sale_columns:
            batch_op.drop_column("loyalty_points_redeemed")
        if "loyalty_points_earned" in sale_columns:
            batch_op.drop_column("loyalty_points_earned")
        if "loyalty_discount" in sale_columns:
            batch_op.drop_column("loyalty_discount")

    customer_columns = _columns_for("customers")
    with op.batch_alter_table("customers") as batch_op:
        if "loyalty_total_redeemed" in customer_columns:
            batch_op.drop_column("loyalty_total_redeemed")
        if "loyalty_total_earned" in customer_columns:
            batch_op.drop_column("loyalty_total_earned")
        if "loyalty_points" in customer_columns:
            batch_op.drop_column("loyalty_points")
