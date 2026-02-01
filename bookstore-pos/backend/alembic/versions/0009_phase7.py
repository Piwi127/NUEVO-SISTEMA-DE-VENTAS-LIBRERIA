"""phase7 cash audits

Revision ID: 0009_phase7
Revises: 0008_phase6
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_phase7"
down_revision = "0008_phase6"
branch_labels = None
depends_on = None


def _has_table(table: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"), {"t": table}).fetchall()
    return len(rows) > 0


def upgrade() -> None:
    if not _has_table("cash_audits"):
        op.create_table(
            "cash_audits",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("cash_session_id", sa.Integer, sa.ForeignKey("cash_sessions.id"), nullable=False),
            sa.Column("type", sa.String(length=2), nullable=False),
            sa.Column("expected_amount", sa.Float, nullable=False),
            sa.Column("counted_amount", sa.Float, nullable=False),
            sa.Column("difference", sa.Float, nullable=False),
            sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
        )


def downgrade() -> None:
    if _has_table("cash_audits"):
        op.drop_table("cash_audits")
