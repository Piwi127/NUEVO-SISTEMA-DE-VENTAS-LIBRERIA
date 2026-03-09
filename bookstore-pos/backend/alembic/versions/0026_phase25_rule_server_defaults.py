"""phase25 promotion rule server defaults

Revision ID: 0026_phase25
Revises: 0025_phase24
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0026_phase25"
down_revision = "0025_phase24"
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


def upgrade() -> None:
    if "promotion_rules" not in _tables():
        return

    columns = _columns_for("promotion_rules")
    with op.batch_alter_table("promotion_rules") as batch_op:
        if "priority" in columns:
            batch_op.alter_column(
                "priority",
                existing_type=sa.Integer(),
                existing_nullable=False,
                server_default=sa.text("0"),
            )
        if "updated_at" in columns:
            batch_op.alter_column(
                "updated_at",
                existing_type=sa.DateTime(timezone=True),
                existing_nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )

    op.execute(sa.text("UPDATE promotion_rules SET priority = COALESCE(priority, 0)"))
    op.execute(sa.text("UPDATE promotion_rules SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)"))


def downgrade() -> None:
    if "promotion_rules" not in _tables():
        return

    columns = _columns_for("promotion_rules")
    with op.batch_alter_table("promotion_rules") as batch_op:
        if "updated_at" in columns:
            batch_op.alter_column(
                "updated_at",
                existing_type=sa.DateTime(timezone=True),
                existing_nullable=False,
                server_default=None,
            )
        if "priority" in columns:
            batch_op.alter_column(
                "priority",
                existing_type=sa.Integer(),
                existing_nullable=False,
                server_default=None,
            )
