@echo off
setlocal
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%..\backend"
cd /d "%BACKEND_DIR%"

set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%get_lan_ip.ps1"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

set "VENV_PY="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%resolve_backend_python.ps1" -BackendDir "%BACKEND_DIR%"`) do set "VENV_PY=%%i"
if not defined VENV_PY goto :no_python
if not exist "%VENV_PY%" goto :no_python

if not exist .env (
  copy .env.example .env >nul
  if errorlevel 1 goto :setup_error
)

"%VENV_PY%" -m pip install -r requirements.txt
if errorlevel 1 goto :setup_error

"%VENV_PY%" -m alembic upgrade head
if errorlevel 1 goto :setup_error

set "CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://%LAN_IP%:5173"
set "HEALTH_ALLOW_LOCAL_ONLY=false"
set "METRICS_ALLOW_LOCAL_ONLY=false"

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>&1
)
set "BACKEND_PORT_BUSY="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr LISTENING') do (
  set "BACKEND_PORT_BUSY=1"
)
if defined BACKEND_PORT_BUSY (
  echo [ERROR] El puerto 8000 sigue ocupado por otro proceso.
  echo [ERROR] Cierra las consolas previas del backend o ejecuta scripts\stop_project.bat como Administrador.
  pause
  exit /b 1
)

set "UVICORN_RELOAD="
if /I "%BACKEND_RELOAD%"=="1" set "UVICORN_RELOAD=--reload"

echo.
echo Backend iniciado para local y red:
echo - http://localhost:8000
echo - http://%LAN_IP%:8000
if defined UVICORN_RELOAD (
  echo - Modo autoreload: ACTIVADO
) else (
  echo - Modo autoreload: DESACTIVADO ^(estable^). Usa BACKEND_RELOAD=1 para activar.
)
echo.
"%VENV_PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 %UVICORN_RELOAD%
exit /b %errorlevel%

:no_python
echo [ERROR] No se encontro un Python utilizable para el backend.
echo [ERROR] Instala Python 3.11 o revisa los permisos del entorno virtual.
pause
exit /b 1

:setup_error
echo [ERROR] No se pudo preparar el backend.
echo [ERROR] Revisa Python, dependencias y migraciones.
pause
exit /b 1
