@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\backend"

set "PYTHON_EXE="
if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=.venv\Scripts\python.exe"
if not defined PYTHON_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PYTHON_EXE if exist "C:\Program Files\Python311\python.exe" set "PYTHON_EXE=C:\Program Files\Python311\python.exe"
if not defined PYTHON_EXE (
  where python >nul 2>&1
  if not errorlevel 1 set "PYTHON_EXE=python"
)

if not defined PYTHON_EXE (
  echo [ERROR] No se encontro Python. Instala Python 3.11 y vuelve a ejecutar.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  "%PYTHON_EXE%" -m venv .venv
)

set "VENV_PY=.venv\Scripts\python.exe"
"%VENV_PY%" -m pip install --upgrade pip
"%VENV_PY%" -m pip install -r requirements.txt
if not exist .env (
  copy .env.example .env
)
"%VENV_PY%" -m alembic upgrade head
"%VENV_PY%" -m uvicorn app.main:app --reload --port 8000
endlocal
