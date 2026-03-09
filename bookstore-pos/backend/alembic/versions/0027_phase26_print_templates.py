"""phase26 print templates and document sequences

Revision ID: 0027_phase26
Revises: 0026_phase25
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0027_phase26"
down_revision = "0026_phase25"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return set(inspector.get_table_names())


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
    return {idx["name"] for idx in inspector.get_indexes(table_name) if idx.get("name")}


def upgrade() -> None:
    tables = _tables()

    if "customers" in tables:
        columns = _columns_for("customers")
        with op.batch_alter_table("customers") as batch_op:
            if "tax_id" not in columns:
                batch_op.add_column(sa.Column("tax_id", sa.String(length=30), nullable=True))
            if "address" not in columns:
                batch_op.add_column(sa.Column("address", sa.String(length=255), nullable=True))
            if "email" not in columns:
                batch_op.add_column(sa.Column("email", sa.String(length=120), nullable=True))
        indexes = _indexes_for("customers")
        if "ix_customers_tax_id" not in indexes:
            op.create_index("ix_customers_tax_id", "customers", ["tax_id"])

    if "sales" in tables:
        columns = _columns_for("sales")
        with op.batch_alter_table("sales") as batch_op:
            if "document_type" not in columns:
                batch_op.add_column(sa.Column("document_type", sa.String(length=20), nullable=False, server_default="TICKET"))
        op.execute(sa.text("UPDATE sales SET document_type = COALESCE(document_type, 'TICKET')"))
        with op.batch_alter_table("sales") as batch_op:
            if "document_type" not in columns:
                batch_op.alter_column("document_type", server_default=None)

    if "system_settings" in tables:
        columns = _columns_for("system_settings")
        with op.batch_alter_table("system_settings") as batch_op:
            if "print_templates_enabled" not in columns:
                batch_op.add_column(sa.Column("print_templates_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")))
        op.execute(sa.text("UPDATE system_settings SET print_templates_enabled = COALESCE(print_templates_enabled, 0)"))
        with op.batch_alter_table("system_settings") as batch_op:
            if "print_templates_enabled" not in columns:
                batch_op.alter_column("print_templates_enabled", server_default=None)

    tables = _tables()
    if "document_sequences" not in tables:
        op.create_table(
            "document_sequences",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("document_type", sa.String(length=20), nullable=False),
            sa.Column("series", sa.String(length=20), nullable=False),
            sa.Column("next_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("number_padding", sa.Integer(), nullable=False, server_default="6"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("scope_type", sa.String(length=20), nullable=False, server_default="GLOBAL"),
            sa.Column("scope_ref_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_document_sequences_document_type", "document_sequences", ["document_type"])
        op.create_index("ix_document_sequences_series", "document_sequences", ["series"])

    if "print_templates" not in tables:
        op.create_table(
            "print_templates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("document_type", sa.String(length=20), nullable=False),
            sa.Column("paper_code", sa.String(length=30), nullable=False, server_default="THERMAL_80"),
            sa.Column("paper_width_mm", sa.Float(), nullable=False, server_default="80"),
            sa.Column("paper_height_mm", sa.Float(), nullable=True),
            sa.Column("margin_top_mm", sa.Float(), nullable=False, server_default="2"),
            sa.Column("margin_right_mm", sa.Float(), nullable=False, server_default="2"),
            sa.Column("margin_bottom_mm", sa.Float(), nullable=False, server_default="2"),
            sa.Column("margin_left_mm", sa.Float(), nullable=False, server_default="2"),
            sa.Column("scope_type", sa.String(length=20), nullable=False, server_default="GLOBAL"),
            sa.Column("scope_ref_id", sa.Integer(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_print_templates_name", "print_templates", ["name"])
        op.create_index("ix_print_templates_document_type", "print_templates", ["document_type"])

    if "print_template_versions" not in tables:
        op.create_table(
            "print_template_versions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("template_id", sa.Integer(), sa.ForeignKey("print_templates.id"), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("schema_json", sa.Text(), nullable=False),
            sa.Column("checksum", sa.String(length=64), nullable=False, server_default=""),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_print_template_versions_template_id", "print_template_versions", ["template_id"])

    if "sale_document_snapshots" not in tables:
        op.create_table(
            "sale_document_snapshots",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
            sa.Column("document_type", sa.String(length=20), nullable=False),
            sa.Column("document_number", sa.String(length=40), nullable=False),
            sa.Column("template_id", sa.Integer(), sa.ForeignKey("print_templates.id"), nullable=True),
            sa.Column("template_version_id", sa.Integer(), sa.ForeignKey("print_template_versions.id"), nullable=True),
            sa.Column("render_context_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("render_result_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("rendered_html", sa.Text(), nullable=True),
            sa.Column("rendered_text", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("printed_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_sale_document_snapshots_sale_id", "sale_document_snapshots", ["sale_id"])
        op.create_index("ix_sale_document_snapshots_document_type", "sale_document_snapshots", ["document_type"])
        op.create_index("ix_sale_document_snapshots_document_number", "sale_document_snapshots", ["document_number"])

    # seed base sequences if missing
    op.execute(
        sa.text(
            "INSERT INTO document_sequences (document_type, series, next_number, number_padding, is_active, scope_type, scope_ref_id) "
            "SELECT 'TICKET', 'T001', 1, 6, 1, 'GLOBAL', NULL "
            "WHERE NOT EXISTS (SELECT 1 FROM document_sequences WHERE document_type = 'TICKET' AND scope_type = 'GLOBAL' AND scope_ref_id IS NULL)"
        )
    )
    op.execute(
        sa.text(
            "INSERT INTO document_sequences (document_type, series, next_number, number_padding, is_active, scope_type, scope_ref_id) "
            "SELECT 'BOLETA', 'B001', 1, 6, 1, 'GLOBAL', NULL "
            "WHERE NOT EXISTS (SELECT 1 FROM document_sequences WHERE document_type = 'BOLETA' AND scope_type = 'GLOBAL' AND scope_ref_id IS NULL)"
        )
    )
    op.execute(
        sa.text(
            "INSERT INTO document_sequences (document_type, series, next_number, number_padding, is_active, scope_type, scope_ref_id) "
            "SELECT 'FACTURA', 'F001', 1, 6, 1, 'GLOBAL', NULL "
            "WHERE NOT EXISTS (SELECT 1 FROM document_sequences WHERE document_type = 'FACTURA' AND scope_type = 'GLOBAL' AND scope_ref_id IS NULL)"
        )
    )


def downgrade() -> None:
    tables = _tables()
    if "sale_document_snapshots" in tables:
        indexes = _indexes_for("sale_document_snapshots")
        if "ix_sale_document_snapshots_document_number" in indexes:
            op.drop_index("ix_sale_document_snapshots_document_number", table_name="sale_document_snapshots")
        if "ix_sale_document_snapshots_document_type" in indexes:
            op.drop_index("ix_sale_document_snapshots_document_type", table_name="sale_document_snapshots")
        if "ix_sale_document_snapshots_sale_id" in indexes:
            op.drop_index("ix_sale_document_snapshots_sale_id", table_name="sale_document_snapshots")
        op.drop_table("sale_document_snapshots")

    tables = _tables()
    if "print_template_versions" in tables:
        indexes = _indexes_for("print_template_versions")
        if "ix_print_template_versions_template_id" in indexes:
            op.drop_index("ix_print_template_versions_template_id", table_name="print_template_versions")
        op.drop_table("print_template_versions")

    tables = _tables()
    if "print_templates" in tables:
        indexes = _indexes_for("print_templates")
        if "ix_print_templates_document_type" in indexes:
            op.drop_index("ix_print_templates_document_type", table_name="print_templates")
        if "ix_print_templates_name" in indexes:
            op.drop_index("ix_print_templates_name", table_name="print_templates")
        op.drop_table("print_templates")

    tables = _tables()
    if "document_sequences" in tables:
        indexes = _indexes_for("document_sequences")
        if "ix_document_sequences_series" in indexes:
            op.drop_index("ix_document_sequences_series", table_name="document_sequences")
        if "ix_document_sequences_document_type" in indexes:
            op.drop_index("ix_document_sequences_document_type", table_name="document_sequences")
        op.drop_table("document_sequences")

    if "system_settings" in tables:
        columns = _columns_for("system_settings")
        with op.batch_alter_table("system_settings") as batch_op:
            if "print_templates_enabled" in columns:
                batch_op.drop_column("print_templates_enabled")

    if "sales" in tables:
        columns = _columns_for("sales")
        with op.batch_alter_table("sales") as batch_op:
            if "document_type" in columns:
                batch_op.drop_column("document_type")

    if "customers" in tables:
        indexes = _indexes_for("customers")
        if "ix_customers_tax_id" in indexes:
            op.drop_index("ix_customers_tax_id", table_name="customers")
        columns = _columns_for("customers")
        with op.batch_alter_table("customers") as batch_op:
            if "email" in columns:
                batch_op.drop_column("email")
            if "address" in columns:
                batch_op.drop_column("address")
            if "tax_id" in columns:
                batch_op.drop_column("tax_id")
