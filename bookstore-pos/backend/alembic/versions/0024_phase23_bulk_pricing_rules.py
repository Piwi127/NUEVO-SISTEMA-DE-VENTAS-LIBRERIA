"""phase23 bulk pricing rules support

Revision ID: 0024_phase23
Revises: 0023_phase22
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0024_phase23"
down_revision = "0023_phase22"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return set(inspector.get_table_names())


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


def _indexes_for(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {idx["name"] for idx in inspector.get_indexes(table_name) if idx.get("name")}


def upgrade() -> None:
    tables = _tables()
    if "promotion_rules" not in tables:
        return

    existing_columns = _columns_for("promotion_rules")
    with op.batch_alter_table("promotion_rules") as batch_op:
        if "min_qty" not in existing_columns:
            batch_op.add_column(sa.Column("min_qty", sa.Integer(), nullable=True))
        if "unit_price" not in existing_columns:
            batch_op.add_column(sa.Column("unit_price", sa.Float(), nullable=True))
        if "bundle_qty" in existing_columns:
            batch_op.alter_column("bundle_qty", existing_type=sa.Integer(), nullable=True)
        if "bundle_price" in existing_columns:
            batch_op.alter_column("bundle_price", existing_type=sa.Float(), nullable=True)

    indexes = _indexes_for("promotion_rules")
    if "ix_promotion_rules_lookup_active" not in indexes:
        op.create_index(
            "ix_promotion_rules_lookup_active",
            "promotion_rules",
            ["product_id", "is_active", "rule_type", "min_qty", "bundle_qty"],
        )


def downgrade() -> None:
    tables = _tables()
    if "promotion_rules" not in tables:
        return

    indexes = _indexes_for("promotion_rules")
    if "ix_promotion_rules_lookup_active" in indexes:
        op.drop_index("ix_promotion_rules_lookup_active", table_name="promotion_rules")

    columns = _columns_for("promotion_rules")
    if "rule_type" in columns:
        op.execute(sa.text("DELETE FROM promotion_rules WHERE rule_type = 'UNIT_PRICE_BY_QTY'"))

    op.execute(sa.text("UPDATE promotion_rules SET bundle_qty = COALESCE(bundle_qty, 2)"))
    op.execute(sa.text("UPDATE promotion_rules SET bundle_price = COALESCE(bundle_price, 0.01)"))

    columns = _columns_for("promotion_rules")
    with op.batch_alter_table("promotion_rules") as batch_op:
        if "bundle_qty" in columns:
            batch_op.alter_column("bundle_qty", existing_type=sa.Integer(), nullable=False)
        if "bundle_price" in columns:
            batch_op.alter_column("bundle_price", existing_type=sa.Float(), nullable=False)
        if "unit_price" in columns:
            batch_op.drop_column("unit_price")
        if "min_qty" in columns:
            batch_op.drop_column("min_qty")
