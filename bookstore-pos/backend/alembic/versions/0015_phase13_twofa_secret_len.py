"""phase13 expand twofa secret length

Revision ID: 0015_phase13
Revises: 0014_phase12
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa

revision = "0015_phase13"
down_revision = "0014_phase12"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "twofa_secret",
            existing_type=sa.String(length=64),
            type_=sa.String(length=255),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "twofa_secret",
            existing_type=sa.String(length=255),
            type_=sa.String(length=64),
            existing_nullable=False,
        )
