"""phase15 add pack promotions and sale item discounts

Revision ID: 0017_phase15
Revises: 0016_phase14
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa

revision = "0017_phase15"
down_revision = "0016_phase14"
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


def _foreign_keys_for(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {fk["name"] for fk in inspector.get_foreign_keys(table_name) if fk.get("name")}


def upgrade() -> None:
    tables = _tables()
    if "promotion_rules" not in tables:
        op.create_table(
            "promotion_rules",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
            sa.Column("rule_type", sa.String(length=30), nullable=False, server_default="BUNDLE_PRICE"),
            sa.Column("bundle_qty", sa.Integer(), nullable=False),
            sa.Column("bundle_price", sa.Float(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_promotion_rules_product_id", "promotion_rules", ["product_id"])

    sales_columns = _columns_for("sales")
    if "pack_discount" not in sales_columns:
        op.add_column("sales", sa.Column("pack_discount", sa.Float(), nullable=False, server_default="0"))
    if "promotion_discount" not in sales_columns:
        op.add_column("sales", sa.Column("promotion_discount", sa.Float(), nullable=False, server_default="0"))

    sale_item_columns = _columns_for("sale_items")
    if "discount" not in sale_item_columns:
        op.add_column("sale_items", sa.Column("discount", sa.Float(), nullable=False, server_default="0"))
    if "final_total" not in sale_item_columns:
        op.add_column("sale_items", sa.Column("final_total", sa.Float(), nullable=False, server_default="0"))
    if "applied_rule_id" not in sale_item_columns:
        op.add_column("sale_items", sa.Column("applied_rule_id", sa.Integer(), nullable=True))
    if "applied_rule_meta" not in sale_item_columns:
        op.add_column("sale_items", sa.Column("applied_rule_meta", sa.Text(), nullable=True))

    foreign_keys = _foreign_keys_for("sale_items")
    fk_name = "fk_sale_items_applied_rule_id_promotion_rules"
    if "applied_rule_id" in _columns_for("sale_items") and fk_name not in foreign_keys:
        with op.batch_alter_table("sale_items") as batch_op:
            batch_op.create_foreign_key(fk_name, "promotion_rules", ["applied_rule_id"], ["id"])

    op.execute(sa.text("UPDATE sales SET pack_discount = COALESCE(pack_discount, 0)"))
    op.execute(sa.text("UPDATE sales SET promotion_discount = COALESCE(promotion_discount, 0)"))
    op.execute(sa.text("UPDATE sale_items SET discount = COALESCE(discount, 0)"))
    op.execute(sa.text("UPDATE sale_items SET final_total = CASE WHEN final_total = 0 THEN line_total ELSE final_total END"))

    with op.batch_alter_table("sales") as batch_op:
        batch_op.alter_column("pack_discount", server_default=None)
        batch_op.alter_column("promotion_discount", server_default=None)
    with op.batch_alter_table("sale_items") as batch_op:
        batch_op.alter_column("discount", server_default=None)
        batch_op.alter_column("final_total", server_default=None)


def downgrade() -> None:
    sale_item_columns = _columns_for("sale_items")
    foreign_keys = _foreign_keys_for("sale_items")
    fk_name = "fk_sale_items_applied_rule_id_promotion_rules"
    if fk_name in foreign_keys:
        with op.batch_alter_table("sale_items") as batch_op:
            batch_op.drop_constraint(fk_name, type_="foreignkey")

    if "applied_rule_meta" in sale_item_columns:
        op.drop_column("sale_items", "applied_rule_meta")
    if "applied_rule_id" in sale_item_columns:
        op.drop_column("sale_items", "applied_rule_id")
    if "final_total" in sale_item_columns:
        op.drop_column("sale_items", "final_total")
    if "discount" in sale_item_columns:
        op.drop_column("sale_items", "discount")

    sales_columns = _columns_for("sales")
    if "promotion_discount" in sales_columns:
        op.drop_column("sales", "promotion_discount")
    if "pack_discount" in sales_columns:
        op.drop_column("sales", "pack_discount")

    tables = _tables()
    if "promotion_rules" in tables:
        op.drop_index("ix_promotion_rules_product_id", table_name="promotion_rules")
        op.drop_table("promotion_rules")
