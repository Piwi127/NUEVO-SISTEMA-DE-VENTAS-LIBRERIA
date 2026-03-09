"""phase24 promotion rule priority and schedule

Revision ID: 0025_phase24
Revises: 0024_phase23
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0025_phase24"
down_revision = "0024_phase23"
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
    if "promotion_rules" not in _tables():
        return

    columns = _columns_for("promotion_rules")
    with op.batch_alter_table("promotion_rules") as batch_op:
        if "priority" not in columns:
            batch_op.add_column(sa.Column("priority", sa.Integer(), nullable=False, server_default="0"))
        if "start_date" not in columns:
            batch_op.add_column(sa.Column("start_date", sa.DateTime(timezone=True), nullable=True))
        if "end_date" not in columns:
            batch_op.add_column(sa.Column("end_date", sa.DateTime(timezone=True), nullable=True))
        if "updated_at" not in columns:
            batch_op.add_column(
                sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"))
            )

    op.execute(sa.text("UPDATE promotion_rules SET priority = COALESCE(priority, 0)"))
    op.execute(sa.text("UPDATE promotion_rules SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)"))

    with op.batch_alter_table("promotion_rules") as batch_op:
        if "priority" not in columns:
            batch_op.alter_column("priority", server_default=None)
        if "updated_at" not in columns:
            batch_op.alter_column("updated_at", server_default=None)

    indexes = _indexes_for("promotion_rules")
    if "ix_promotion_rules_active_window_priority" not in indexes:
        op.create_index(
            "ix_promotion_rules_active_window_priority",
            "promotion_rules",
            ["product_id", "is_active", "rule_type", "priority", "start_date", "end_date"],
        )


def downgrade() -> None:
    if "promotion_rules" not in _tables():
        return

    indexes = _indexes_for("promotion_rules")
    if "ix_promotion_rules_active_window_priority" in indexes:
        op.drop_index("ix_promotion_rules_active_window_priority", table_name="promotion_rules")

    columns = _columns_for("promotion_rules")
    with op.batch_alter_table("promotion_rules") as batch_op:
        if "updated_at" in columns:
            batch_op.drop_column("updated_at")
        if "end_date" in columns:
            batch_op.drop_column("end_date")
        if "start_date" in columns:
            batch_op.drop_column("start_date")
        if "priority" in columns:
            batch_op.drop_column("priority")
