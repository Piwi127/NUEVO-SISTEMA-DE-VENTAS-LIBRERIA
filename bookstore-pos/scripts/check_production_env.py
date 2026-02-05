#!/usr/bin/env python3
import os
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app.core.config import settings  # noqa: E402


def fail(msg: str) -> None:
    print(f"[ERROR] {msg}")
    raise SystemExit(1)


def main() -> None:
    env = settings.environment.lower()
    is_prod = env in {"prod", "production"}
    if not is_prod:
        print(f"[INFO] ENVIRONMENT={settings.environment}. Preflight de produccion omitido.")
        return

    if not settings.jwt_secret or settings.jwt_secret in {
        "change_me_super_secret",
        "dev_local_secret_change_this",
    }:
        fail("JWT_SECRET inseguro o por defecto")

    if not settings.cookie_secure:
        fail("COOKIE_SECURE debe ser true en produccion")

    samesite = settings.cookie_samesite.lower()
    if samesite not in {"lax", "strict", "none"}:
        fail("COOKIE_SAMESITE debe ser lax, strict o none")
    if samesite == "none" and not settings.cookie_secure:
        fail("COOKIE_SAMESITE=none requiere COOKIE_SECURE=true")

    if not settings.twofa_encryption_key:
        fail("TWOFA_ENCRYPTION_KEY debe estar configurada")

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    if not origins:
        fail("CORS_ORIGINS no puede estar vacio")
    if any("localhost" in o or "127.0.0.1" in o for o in origins):
        fail("CORS_ORIGINS no debe incluir localhost/127.0.0.1")

    print("[OK] Preflight de produccion superado.")


if __name__ == "__main__":
    main()
