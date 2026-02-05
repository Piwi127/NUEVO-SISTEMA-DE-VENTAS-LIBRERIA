@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\backend"
if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\activate
pip install -r requirements.txt
if not exist .env (
  copy .env.example .env
)
alembic upgrade head
uvicorn app.main:app --reload --port 8000
endlocal
