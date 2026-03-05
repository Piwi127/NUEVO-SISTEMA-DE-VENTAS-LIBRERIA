@echo off
setlocal
set ROOT=%~dp0
set "TASK_NAME=BookstorePOS-DailyBackup"
set "TASK_TIME=%~1"
if "%TASK_TIME%"=="" set "TASK_TIME=22:00"

set "BACKUP_CMD=%ROOT%backup_db.bat"
if not exist "%BACKUP_CMD%" (
  echo [ERROR] No se encontro backup_db.bat en scripts.
  exit /b 1
)

schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel%==0 (
  echo [INFO] Actualizando tarea existente: %TASK_NAME%
  schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
)

schtasks /create ^
  /sc DAILY ^
  /tn "%TASK_NAME%" ^
  /tr "\"%BACKUP_CMD%\"" ^
  /st %TASK_TIME% ^
  /f >nul

if %errorlevel% neq 0 (
  echo [ERROR] No se pudo crear la tarea programada.
  echo [INFO] Ejecuta esta consola como Administrador.
  exit /b 1
)

echo [OK] Tarea creada: %TASK_NAME%
echo [OK] Hora diaria: %TASK_TIME%
echo [INFO] Para eliminarla: scripts\remove_daily_backup_task.bat
endlocal
