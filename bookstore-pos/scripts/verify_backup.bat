@echo off
setlocal

if "%~1"=="" (
  echo Uso: scripts\verify_backup.bat "RUTA\backup.db"
  exit /b 1
)

set "BACKUP_FILE=%~1"

if exist "..\backend\.venv\Scripts\python.exe" (
  "..\backend\.venv\Scripts\python.exe" "%~dp0verify_backup.py" --file "%BACKUP_FILE%"
) else (
  py -3 "%~dp0verify_backup.py" --file "%BACKUP_FILE%"
)
