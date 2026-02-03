#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR/backend"

if [ ! -d .venv ]; then
  python -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

alembic upgrade head

exec uvicorn app.main:app --reload --port 8000
