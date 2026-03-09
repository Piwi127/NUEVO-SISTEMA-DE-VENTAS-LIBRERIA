"""phase20 refresh token rotation and session families

Revision ID: 0021_phase20
Revises: 0020_phase18
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0021_phase20"
down_revision = "0020_phase18"
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


def _table_exists(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    session_columns = _columns_for("user_sessions")
    with op.batch_alter_table("user_sessions") as batch_op:
        if "family_id" not in session_columns:
            batch_op.add_column(sa.Column("family_id", sa.String(length=64), nullable=True))

    if "family_id" not in session_columns:
        op.execute(sa.text("UPDATE user_sessions SET family_id = COALESCE(family_id, jti)"))
        with op.batch_alter_table("user_sessions") as batch_op:
            batch_op.alter_column("family_id", nullable=False)

    session_indexes = _indexes_for("user_sessions")
    if "ix_user_sessions_family_id" not in session_indexes:
        op.create_index("ix_user_sessions_family_id", "user_sessions", ["family_id"], unique=False)

    if not _table_exists("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("family_id", sa.String(length=64), nullable=False),
            sa.Column("jti", sa.String(length=64), nullable=False),
            sa.Column("token_hash", sa.String(length=128), nullable=False),
            sa.Column("parent_jti", sa.String(length=64), nullable=True),
            sa.Column("replaced_by_jti", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        )

    refresh_indexes = _indexes_for("refresh_tokens")
    if "ix_refresh_tokens_user_id" not in refresh_indexes:
        op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
    if "ix_refresh_tokens_family_id" not in refresh_indexes:
        op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"], unique=False)
    if "ix_refresh_tokens_jti" not in refresh_indexes:
        op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)
    if "ix_refresh_tokens_expires_at" not in refresh_indexes:
        op.create_index("ix_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"], unique=False)
    if "ix_refresh_tokens_revoked_at" not in refresh_indexes:
        op.create_index("ix_refresh_tokens_revoked_at", "refresh_tokens", ["revoked_at"], unique=False)
    if "ix_refresh_tokens_replaced_by_jti" not in refresh_indexes:
        op.create_index("ix_refresh_tokens_replaced_by_jti", "refresh_tokens", ["replaced_by_jti"], unique=False)


def downgrade() -> None:
    if _table_exists("refresh_tokens"):
        refresh_indexes = _indexes_for("refresh_tokens")
        if "ix_refresh_tokens_replaced_by_jti" in refresh_indexes:
            op.drop_index("ix_refresh_tokens_replaced_by_jti", table_name="refresh_tokens")
        if "ix_refresh_tokens_revoked_at" in refresh_indexes:
            op.drop_index("ix_refresh_tokens_revoked_at", table_name="refresh_tokens")
        if "ix_refresh_tokens_expires_at" in refresh_indexes:
            op.drop_index("ix_refresh_tokens_expires_at", table_name="refresh_tokens")
        if "ix_refresh_tokens_jti" in refresh_indexes:
            op.drop_index("ix_refresh_tokens_jti", table_name="refresh_tokens")
        if "ix_refresh_tokens_family_id" in refresh_indexes:
            op.drop_index("ix_refresh_tokens_family_id", table_name="refresh_tokens")
        if "ix_refresh_tokens_user_id" in refresh_indexes:
            op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
        op.drop_table("refresh_tokens")

    session_columns = _columns_for("user_sessions")
    session_indexes = _indexes_for("user_sessions")
    if "ix_user_sessions_family_id" in session_indexes:
        op.drop_index("ix_user_sessions_family_id", table_name="user_sessions")
    if "family_id" in session_columns:
        with op.batch_alter_table("user_sessions") as batch_op:
            batch_op.drop_column("family_id")
