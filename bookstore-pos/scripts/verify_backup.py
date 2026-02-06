#!/usr/bin/env python3
import argparse
import hashlib
import sqlite3
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def verify_sqlite(path: Path) -> tuple[bool, str]:
    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("PRAGMA integrity_check;")
        row = cur.fetchone()
        conn.close()
        result = (row[0] if row else "").strip().lower()
        return result == "ok", result or "unknown"
    except Exception as exc:  # pragma: no cover - defensive for runtime usage
        return False, str(exc)


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify SQLite backup integrity and checksum.")
    parser.add_argument(
        "--file",
        required=True,
        help="Path to backup .db file to verify.",
    )
    args = parser.parse_args()

    backup = Path(args.file).expanduser().resolve()
    if not backup.exists():
        raise SystemExit(f"[ERROR] Backup no encontrado: {backup}")
    if backup.suffix.lower() != ".db":
        raise SystemExit(f"[ERROR] El archivo no parece backup sqlite (.db): {backup}")

    ok, integrity_msg = verify_sqlite(backup)
    checksum = sha256_file(backup)
    size_kb = backup.stat().st_size / 1024

    print(f"[INFO] Archivo: {backup}")
    print(f"[INFO] Tamano: {size_kb:.2f} KB")
    print(f"[INFO] SHA256: {checksum}")
    print(f"[INFO] Integridad SQLite: {integrity_msg}")

    if not ok:
        raise SystemExit("[ERROR] Backup invalido: integrity_check fallo")

    print("[OK] Backup verificado correctamente.")


if __name__ == "__main__":
    main()
