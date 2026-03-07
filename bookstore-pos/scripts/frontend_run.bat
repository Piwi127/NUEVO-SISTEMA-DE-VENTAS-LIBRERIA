@echo off
setlocal
set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%..\frontend"
cd /d "%FRONTEND_DIR%"

set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%get_lan_ip.ps1"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"

set "NPM_CMD="
if exist "C:\Program Files\nodejs\npm.cmd" set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
if not defined NPM_CMD (
  where npm.cmd >nul 2>&1
  if not errorlevel 1 set "NPM_CMD=npm.cmd"
)

if not defined NPM_CMD (
  echo [ERROR] No se encontro npm/node. Instala Node.js LTS y vuelve a ejecutar.
  pause
  exit /b 1
)

call "%NPM_CMD%" install --no-audit --no-fund
if errorlevel 1 goto :setup_error

if not exist .env (
  copy .env.example .env >nul
  if errorlevel 1 goto :setup_error
)

set "VITE_API_URL="
echo.
echo Frontend iniciado para local y red:
echo - http://localhost:5173
echo - http://%LAN_IP%:5173
echo.
call "%NPM_CMD%" run dev
exit /b %errorlevel%

:setup_error
echo [ERROR] No se pudo preparar el frontend.
echo [ERROR] Revisa Node.js, npm y las dependencias del proyecto.
pause
exit /b 1
