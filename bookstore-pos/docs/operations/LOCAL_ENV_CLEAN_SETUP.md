# Local Environment Setup (Clean)

## Goal
Run the project locally without committing sensitive values (`.env`) to git.

## Backend
1. Copy template:
   - `cp backend/.env.example backend/.env`
2. Set secure local values:
   - `JWT_SECRET`
   - `TWOFA_ENCRYPTION_KEY` (recommended)
3. Create venv and install deps:
   - `python -m venv backend/.venv`
   - `backend/.venv/Scripts/pip install -r backend/requirements.txt`
4. Run migrations:
   - `backend/.venv/Scripts/alembic -c backend/alembic.ini upgrade head`
5. Start API:
   - `backend/.venv/Scripts/uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Frontend
1. Copy template:
   - `cp frontend/.env.example frontend/.env`
2. Install:
   - `npm --prefix frontend ci`
3. Start:
   - `npm --prefix frontend run dev`

## Verification
- Login works and sets `access_token`, `refresh_token`, `csrf_token`.
- `POST /auth/refresh` rotates refresh token.
- `POST /inventory/import-jobs` creates and processes job.

## Git hygiene
- Never commit `.env` files.
- Before push, run:
  - `git status`
  - `git ls-files | rg "\.env$"` (must return empty)
  - `python -m ruff check backend`
  - `npm --prefix frontend run lint`
