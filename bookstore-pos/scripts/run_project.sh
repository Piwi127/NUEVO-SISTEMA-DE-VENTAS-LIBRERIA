#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$ROOT_DIR/backend_run.sh" &
BACKEND_PID=$!

"$ROOT_DIR/frontend_run.sh" &
FRONTEND_PID=$!

cat <<INFO
Servidores iniciados:
- Backend (PID $BACKEND_PID) http://localhost:8000
- Frontend (PID $FRONTEND_PID) http://localhost:5173

Ctrl+C para detener ambos.
INFO

cleanup() {
  echo "Deteniendo servidores..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM

wait "$BACKEND_PID" "$FRONTEND_PID"
