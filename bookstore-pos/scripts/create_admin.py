#!/usr/bin/env python3
import argparse
import asyncio
import os
import subprocess
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from sqlalchemy import select  # noqa: E402

from app.core.security import get_password_hash, validate_password  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


def ensure_schema() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT_DIR,
        check=True,
    )


async def upsert_admin(username: str, password: str) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        password_hash = get_password_hash(password)
        if user:
            user.password_hash = password_hash
            user.role = "admin"
            user.is_active = True
        else:
            user = User(
                username=username,
                password_hash=password_hash,
                role="admin",
                is_active=True,
            )
            session.add(user)
        await session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin user.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    username = args.username.strip()
    if not username:
        raise SystemExit("Username no puede estar vacio")
    if len(username) < 3:
        raise SystemExit("Username debe tener al menos 3 caracteres")
    try:
        validate_password(args.password)
    except ValueError as exc:
        raise SystemExit(f"Password invalido: {exc}") from exc
    ensure_schema()
    asyncio.run(upsert_admin(username, args.password))


if __name__ == "__main__":
    main()
