#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import shutil


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore bookstore.db from backup file")
    parser.add_argument("--file", required=True, help="Ruta al archivo .db de backup")
    args = parser.parse_args()

    backup = Path(args.file).expanduser().resolve()
    if not backup.exists():
        raise SystemExit(f"[ERROR] Backup no encontrado: {backup}")

    root = Path(__file__).resolve().parents[1]
    backend_dir = root / "backend"
    db_path = backend_dir / "bookstore.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(backup, db_path)
    print(f"[OK] Base restaurada desde: {backup}")


if __name__ == "__main__":
    main()
