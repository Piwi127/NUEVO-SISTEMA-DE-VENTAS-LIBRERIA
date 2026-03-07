"""phase18 bookstore metadata for products

Revision ID: 0020_phase18
Revises: 0019_phase17
Create Date: 2026-03-06
"""

from alembic import op
import sqlalchemy as sa

revision = "0020_phase18"
down_revision = "0019_phase17"
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



def _indexes_for(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}



def upgrade() -> None:
    product_columns = _columns_for("products")
    with op.batch_alter_table("products") as batch_op:
        if "author" not in product_columns:
            batch_op.add_column(sa.Column("author", sa.String(length=160), nullable=False, server_default=""))
        if "publisher" not in product_columns:
            batch_op.add_column(sa.Column("publisher", sa.String(length=160), nullable=False, server_default=""))
        if "isbn" not in product_columns:
            batch_op.add_column(sa.Column("isbn", sa.String(length=32), nullable=False, server_default=""))
        if "barcode" not in product_columns:
            batch_op.add_column(sa.Column("barcode", sa.String(length=80), nullable=False, server_default=""))
        if "shelf_location" not in product_columns:
            batch_op.add_column(sa.Column("shelf_location", sa.String(length=80), nullable=False, server_default=""))

    op.execute(sa.text("UPDATE products SET author = COALESCE(author, '')"))
    op.execute(sa.text("UPDATE products SET publisher = COALESCE(publisher, '')"))
    op.execute(sa.text("UPDATE products SET isbn = COALESCE(REPLACE(REPLACE(isbn, '-', ''), ' ', ''), '')"))
    op.execute(sa.text("UPDATE products SET barcode = COALESCE(barcode, '')"))
    op.execute(sa.text("UPDATE products SET shelf_location = COALESCE(shelf_location, '')"))

    with op.batch_alter_table("products") as batch_op:
        if "author" not in product_columns:
            batch_op.alter_column("author", server_default=None)
        if "publisher" not in product_columns:
            batch_op.alter_column("publisher", server_default=None)
        if "isbn" not in product_columns:
            batch_op.alter_column("isbn", server_default=None)
        if "barcode" not in product_columns:
            batch_op.alter_column("barcode", server_default=None)
        if "shelf_location" not in product_columns:
            batch_op.alter_column("shelf_location", server_default=None)

    product_indexes = _indexes_for("products")
    if "ix_products_author" not in product_indexes:
        op.create_index("ix_products_author", "products", ["author"], unique=False)
    if "ix_products_publisher" not in product_indexes:
        op.create_index("ix_products_publisher", "products", ["publisher"], unique=False)
    if "ix_products_isbn" not in product_indexes:
        op.create_index("ix_products_isbn", "products", ["isbn"], unique=False)
    if "ix_products_barcode" not in product_indexes:
        op.create_index("ix_products_barcode", "products", ["barcode"], unique=False)



def downgrade() -> None:
    product_indexes = _indexes_for("products")
    if "ix_products_barcode" in product_indexes:
        op.drop_index("ix_products_barcode", table_name="products")
    if "ix_products_isbn" in product_indexes:
        op.drop_index("ix_products_isbn", table_name="products")
    if "ix_products_publisher" in product_indexes:
        op.drop_index("ix_products_publisher", table_name="products")
    if "ix_products_author" in product_indexes:
        op.drop_index("ix_products_author", table_name="products")

    product_columns = _columns_for("products")
    with op.batch_alter_table("products") as batch_op:
        if "shelf_location" in product_columns:
            batch_op.drop_column("shelf_location")
        if "barcode" in product_columns:
            batch_op.drop_column("barcode")
        if "isbn" in product_columns:
            batch_op.drop_column("isbn")
        if "publisher" in product_columns:
            batch_op.drop_column("publisher")
        if "author" in product_columns:
            batch_op.drop_column("author")
