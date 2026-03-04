"""phase14 add product tags column

Revision ID: 0016_phase14
Revises: 0015_phase13
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa

revision = "0016_phase14"
down_revision = "0015_phase13"
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
    columns = _columns_for("products")
    if "tags" not in columns:
        op.add_column("products", sa.Column("tags", sa.String(length=500), nullable=False, server_default=""))
        op.execute(sa.text("UPDATE products SET tags = '' WHERE tags IS NULL"))
        with op.batch_alter_table("products") as batch_op:
            batch_op.alter_column("tags", server_default=None)


def downgrade() -> None:
    columns = _columns_for("products")
    if "tags" in columns:
        op.drop_column("products", "tags")
