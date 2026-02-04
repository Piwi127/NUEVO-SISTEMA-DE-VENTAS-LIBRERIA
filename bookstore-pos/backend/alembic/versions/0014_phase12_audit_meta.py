"""phase12 audit ip and user agent

Revision ID: 0014_phase12
Revises: 0013_phase11
Create Date: 2026-02-04
"""

from alembic import op
import sqlalchemy as sa

revision = "0014_phase12"
down_revision = "0013_phase11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("ip", sa.String(length=45), nullable=True))
    op.add_column("audit_logs", sa.Column("user_agent", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("audit_logs", "user_agent")
    op.drop_column("audit_logs", "ip")
