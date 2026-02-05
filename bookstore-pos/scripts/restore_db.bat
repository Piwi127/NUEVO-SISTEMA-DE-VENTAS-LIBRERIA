@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%.."

if "%~1"=="" (
  echo Uso: restore_db.bat "RUTA_AL_BACKUP.db"
  exit /b 1
)

if not exist "backend\\.venv\\Scripts\\python.exe" (
  echo [ERROR] No se encontro python del entorno en backend\\.venv
  exit /b 1
)

"backend\\.venv\\Scripts\\python.exe" "scripts\\restore_db.py" --file "%~1"
endlocal
