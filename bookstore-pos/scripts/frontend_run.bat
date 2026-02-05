@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\frontend"

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
if not exist .env (
  copy .env.example .env
)
call "%NPM_CMD%" run dev
endlocal
