@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\backend"

set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$ip=(Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } ^| Select-Object -First 1 -ExpandProperty IPv4Address ^| Select-Object -ExpandProperty IPAddress); if(-not $ip){$ip=(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*'} ^| Select-Object -First 1 -ExpandProperty IPAddress)}; if(-not $ip){$ip='127.0.0.1'}; Write-Output $ip"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

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
set "CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://%LAN_IP%:5173"
set "HEALTH_ALLOW_LOCAL_ONLY=false"
set "METRICS_ALLOW_LOCAL_ONLY=false"

REM Cierra cualquier backend previo en puerto 8000 para evitar listeners duplicados.
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
endlocal
