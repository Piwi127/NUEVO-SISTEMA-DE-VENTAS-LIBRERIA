@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\backend"

if not exist ".venv\\Scripts\\python.exe" (
  echo [ERROR] No se encontro .venv. Ejecuta primero run_windows.bat o instala dependencias backend.
  exit /b 1
)

".venv\\Scripts\\python.exe" "..\\scripts\\check_production_env.py"
endlocal
