"""phase10 add common indexes

Revision ID: 0012_phase10
Revises: 0011_phase9
Create Date: 2026-02-03
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0012_phase10"
down_revision = "0011_phase9"
branch_labels = None
depends_on = None


def _existing_indexes() -> set[str]:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='index'"))
    return {row[0] for row in rows}


def upgrade() -> None:
    existing = _existing_indexes()
    if "ix_products_sku" not in existing:
        op.create_index("ix_products_sku", "products", ["sku"], unique=False)
    if "ix_products_name" not in existing:
        op.create_index("ix_products_name", "products", ["name"], unique=False)
    if "ix_customers_name" not in existing:
        op.create_index("ix_customers_name", "customers", ["name"], unique=False)
    if "ix_suppliers_name" not in existing:
        op.create_index("ix_suppliers_name", "suppliers", ["name"], unique=False)
    if "ix_sales_created_at" not in existing:
        op.create_index("ix_sales_created_at", "sales", ["created_at"], unique=False)
    if "ix_purchases_created_at" not in existing:
        op.create_index("ix_purchases_created_at", "purchases", ["created_at"], unique=False)


def downgrade() -> None:
    existing = _existing_indexes()
    if "ix_purchases_created_at" in existing:
        op.drop_index("ix_purchases_created_at", table_name="purchases")
    if "ix_sales_created_at" in existing:
        op.drop_index("ix_sales_created_at", table_name="sales")
    if "ix_suppliers_name" in existing:
        op.drop_index("ix_suppliers_name", table_name="suppliers")
    if "ix_customers_name" in existing:
        op.drop_index("ix_customers_name", table_name="customers")
    if "ix_products_name" in existing:
        op.drop_index("ix_products_name", table_name="products")
    if "ix_products_sku" in existing:
        op.drop_index("ix_products_sku", table_name="products")
