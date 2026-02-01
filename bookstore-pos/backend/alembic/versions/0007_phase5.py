"""phase5 auth 2fa lockout

Revision ID: 0007_phase5
Revises: 0006_phase4
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_phase5"
down_revision = "0006_phase4"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)


def upgrade() -> None:
    if not _has_column("users", "failed_attempts"):
        op.add_column("users", sa.Column("failed_attempts", sa.Integer, nullable=False, server_default=sa.text("0")))
    if not _has_column("users", "locked_until"):
        op.add_column("users", sa.Column("locked_until", sa.DateTime, nullable=True))
    if not _has_column("users", "twofa_enabled"):
        op.add_column("users", sa.Column("twofa_enabled", sa.Boolean, nullable=False, server_default=sa.text("0")))
    if not _has_column("users", "twofa_secret"):
        op.add_column("users", sa.Column("twofa_secret", sa.String(length=64), nullable=False, server_default=""))


def downgrade() -> None:
    if _has_column("users", "twofa_secret"):
        op.drop_column("users", "twofa_secret")
    if _has_column("users", "twofa_enabled"):
        op.drop_column("users", "twofa_enabled")
    if _has_column("users", "locked_until"):
        op.drop_column("users", "locked_until")
    if _has_column("users", "failed_attempts"):
        op.drop_column("users", "failed_attempts")
