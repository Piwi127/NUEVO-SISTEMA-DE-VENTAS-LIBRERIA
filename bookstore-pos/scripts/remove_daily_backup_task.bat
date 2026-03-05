@echo off
setlocal
set "TASK_NAME=BookstorePOS-DailyBackup"

schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
  echo [INFO] La tarea %TASK_NAME% no existe.
  exit /b 0
)

schtasks /delete /tn "%TASK_NAME%" /f >nul
if %errorlevel% neq 0 (
  echo [ERROR] No se pudo eliminar la tarea %TASK_NAME%.
  echo [INFO] Ejecuta esta consola como Administrador.
  exit /b 1
)

echo [OK] Tarea eliminada: %TASK_NAME%
endlocal
