"""phase21 inventory import jobs and row errors

Revision ID: 0022_phase21
Revises: 0021_phase20
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0022_phase21"
down_revision = "0021_phase20"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _indexes_for(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    if not _table_exists("inventory_import_jobs"):
        op.create_table(
            "inventory_import_jobs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("file_type", sa.String(length=10), nullable=False),
            sa.Column("request_id", sa.String(length=64), nullable=True),
            sa.Column("batch_size", sa.Integer(), nullable=False, server_default="200"),
            sa.Column("total_rows", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("processed_rows", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("success_rows", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_rows", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    job_indexes = _indexes_for("inventory_import_jobs")
    if "ix_inventory_import_jobs_created_by" not in job_indexes:
        op.create_index("ix_inventory_import_jobs_created_by", "inventory_import_jobs", ["created_by"], unique=False)
    if "ix_inventory_import_jobs_status" not in job_indexes:
        op.create_index("ix_inventory_import_jobs_status", "inventory_import_jobs", ["status"], unique=False)

    if not _table_exists("inventory_import_job_errors"):
        op.create_table(
            "inventory_import_job_errors",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("job_id", sa.Integer(), sa.ForeignKey("inventory_import_jobs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("row_number", sa.Integer(), nullable=False),
            sa.Column("sku", sa.String(length=80), nullable=True),
            sa.Column("detail", sa.Text(), nullable=False),
            sa.Column("raw_data", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    error_indexes = _indexes_for("inventory_import_job_errors")
    if "ix_inventory_import_job_errors_job_id" not in error_indexes:
        op.create_index("ix_inventory_import_job_errors_job_id", "inventory_import_job_errors", ["job_id"], unique=False)


def downgrade() -> None:
    if _table_exists("inventory_import_job_errors"):
        error_indexes = _indexes_for("inventory_import_job_errors")
        if "ix_inventory_import_job_errors_job_id" in error_indexes:
            op.drop_index("ix_inventory_import_job_errors_job_id", table_name="inventory_import_job_errors")
        op.drop_table("inventory_import_job_errors")

    if _table_exists("inventory_import_jobs"):
        job_indexes = _indexes_for("inventory_import_jobs")
        if "ix_inventory_import_jobs_status" in job_indexes:
            op.drop_index("ix_inventory_import_jobs_status", table_name="inventory_import_jobs")
        if "ix_inventory_import_jobs_created_by" in job_indexes:
            op.drop_index("ix_inventory_import_jobs_created_by", table_name="inventory_import_jobs")
        op.drop_table("inventory_import_jobs")
