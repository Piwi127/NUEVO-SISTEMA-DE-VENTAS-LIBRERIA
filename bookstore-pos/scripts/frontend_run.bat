@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\frontend"

set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$ip=(Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } ^| Select-Object -First 1 -ExpandProperty IPv4Address ^| Select-Object -ExpandProperty IPAddress); if(-not $ip){$ip=(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*'} ^| Select-Object -First 1 -ExpandProperty IPAddress)}; if(-not $ip){$ip='127.0.0.1'}; Write-Output $ip"`) do set "LAN_IP=%%i"
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
if not exist .env (
  copy .env.example .env
)
set "VITE_API_URL="
echo.
echo Frontend iniciado para local y red:
echo - http://localhost:5173
echo - http://%LAN_IP%:5173
echo.
call "%NPM_CMD%" run dev -- --host 0.0.0.0 --port 5173 --strictPort
endlocal
