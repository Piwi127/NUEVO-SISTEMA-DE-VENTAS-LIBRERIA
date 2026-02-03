"""phase9 stocklevel migration

Revision ID: 0011_phase9
Revises: 0010_phase8
Create Date: 2026-02-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0011_phase9"
down_revision = "0010_phase8"
branch_labels = None
depends_on = None


def _has_table(table: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"), {"t": table}).fetchall()
    return len(rows) > 0


def upgrade() -> None:
    conn = op.get_bind()

    # Ensure warehouses table exists
    if not _has_table("warehouses"):
        op.create_table(
            "warehouses",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False, unique=True),
            sa.Column("location", sa.String(length=100), nullable=False, server_default=""),
        )

    # Ensure stock_levels table exists
    if not _has_table("stock_levels"):
        op.create_table(
            "stock_levels",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
            sa.Column("warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id"), nullable=False),
            sa.Column("qty", sa.Integer, nullable=False, server_default="0"),
        )

    # Ensure default warehouse exists
    row = conn.execute(sa.text("SELECT id FROM warehouses ORDER BY id LIMIT 1")).fetchone()
    if not row:
        conn.execute(sa.text("INSERT INTO warehouses (name, location) VALUES (:name, :loc)"), {"name": "Almacen Principal", "loc": ""})
        row = conn.execute(sa.text("SELECT id FROM warehouses ORDER BY id LIMIT 1")).fetchone()
    warehouse_id = row[0]

    # Ensure system_settings default_warehouse_id is set
    settings = conn.execute(sa.text("SELECT id, default_warehouse_id FROM system_settings LIMIT 1")).fetchone()
    if settings:
        if settings[1] is None:
            conn.execute(sa.text("UPDATE system_settings SET default_warehouse_id=:w WHERE id=:id"), {"w": warehouse_id, "id": settings[0]})

    # Migrate Product.stock to StockLevel
    products = conn.execute(sa.text("SELECT id, stock FROM products")).fetchall()
    for pid, stock in products:
        exists = conn.execute(
            sa.text("SELECT id FROM stock_levels WHERE product_id=:p AND warehouse_id=:w"),
            {"p": pid, "w": warehouse_id},
        ).fetchone()
        if exists:
            conn.execute(
                sa.text("UPDATE stock_levels SET qty=:q WHERE id=:id"),
                {"q": stock, "id": exists[0]},
            )
        else:
            conn.execute(
                sa.text("INSERT INTO stock_levels (product_id, warehouse_id, qty) VALUES (:p, :w, :q)"),
                {"p": pid, "w": warehouse_id, "q": stock},
            )


def downgrade() -> None:
    # No destructive downgrade for data migration
    pass
