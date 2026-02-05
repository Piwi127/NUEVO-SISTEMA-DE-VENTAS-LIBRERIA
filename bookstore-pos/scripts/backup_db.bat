@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%.."

if not exist "backend\\.venv\\Scripts\\python.exe" (
  echo [ERROR] No se encontro python del entorno en backend\\.venv
  exit /b 1
)

"backend\\.venv\\Scripts\\python.exe" "scripts\\backup_db.py"
endlocal
