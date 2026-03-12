"""Add onupdate to updated_at in InventoryImportJob

Revision ID: 0027_fix_inventory_updated_at
Revises: 0026
Create Date: 2026-03-12

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0027_fix_inventory_updated_at'
down_revision = '0026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The onupdate is a SQLAlchemy-level fix, no migration needed
    # as it only affects ORM-level updates, not the database schema
    pass


def downgrade() -> None:
    pass
