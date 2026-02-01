"""settings

Revision ID: 0002_settings
Revises: 0001_initial
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_settings"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_name", sa.String(length=200), nullable=False, server_default="Bookstore POS"),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="PEN"),
        sa.Column("tax_rate", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("store_address", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("store_phone", sa.String(length=50), nullable=False, server_default=""),
        sa.Column("logo_url", sa.String(length=255), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("system_settings")
