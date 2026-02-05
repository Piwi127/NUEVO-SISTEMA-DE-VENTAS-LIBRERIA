#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    backend_dir = root / "backend"
    db_path = backend_dir / "bookstore.db"
    backups_dir = root / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)

    if not db_path.exists():
        raise SystemExit(f"[ERROR] Base no encontrada: {db_path}")

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dst = backups_dir / f"bookstore-{stamp}.db"
    shutil.copy2(db_path, dst)
    print(f"[OK] Backup creado: {dst}")


if __name__ == "__main__":
    main()
