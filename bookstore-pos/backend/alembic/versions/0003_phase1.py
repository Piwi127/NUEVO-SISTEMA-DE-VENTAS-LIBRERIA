"""phase1 settings and permissions

Revision ID: 0003_phase1
Revises: 0002_settings
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_phase1"
down_revision = "0002_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("tax_rate", sa.Float, nullable=False, server_default=sa.text("0")))
    op.add_column("products", sa.Column("tax_included", sa.Boolean, nullable=False, server_default=sa.text("0")))

    op.add_column("system_settings", sa.Column("tax_included", sa.Boolean, nullable=False, server_default=sa.text("0")))
    op.add_column("system_settings", sa.Column("store_tax_id", sa.String(length=50), nullable=False, server_default=""))
    op.add_column("system_settings", sa.Column("payment_methods", sa.String(length=255), nullable=False, server_default="CASH,CARD,TRANSFER"))
    op.add_column("system_settings", sa.Column("invoice_prefix", sa.String(length=20), nullable=False, server_default="B001"))
    op.add_column("system_settings", sa.Column("invoice_next", sa.Integer, nullable=False, server_default=sa.text("1")))

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("permission", sa.String(length=100), nullable=False),
    )
    op.create_index("ix_role_permissions_role", "role_permissions", ["role"], unique=False)
    op.create_index("ix_role_permissions_permission", "role_permissions", ["permission"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("entity", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=50), nullable=False),
        sa.Column("details", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_index("ix_role_permissions_permission", table_name="role_permissions")
    op.drop_index("ix_role_permissions_role", table_name="role_permissions")
    op.drop_table("role_permissions")

    op.drop_column("system_settings", "invoice_next")
    op.drop_column("system_settings", "invoice_prefix")
    op.drop_column("system_settings", "payment_methods")
    op.drop_column("system_settings", "store_tax_id")
    op.drop_column("system_settings", "tax_included")

    op.drop_column("products", "tax_included")
    op.drop_column("products", "tax_rate")
