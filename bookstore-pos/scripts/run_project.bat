@echo off
setlocal
set ROOT=%~dp0

call "%ROOT%stop_project.bat" >nul 2>&1
timeout /t 1 /nobreak >nul

set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$ip=(Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } ^| Select-Object -First 1 -ExpandProperty IPv4Address ^| Select-Object -ExpandProperty IPAddress); if(-not $ip){$ip=(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*'} ^| Select-Object -First 1 -ExpandProperty IPAddress)}; if(-not $ip){$ip='127.0.0.1'}; Write-Output $ip"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

start "Backend" cmd /k "%ROOT%backend_run.bat"
start "Frontend" cmd /k "%ROOT%frontend_run.bat"

echo.
echo Proyecto iniciado.
echo Frontend:
echo - Local: http://localhost:5173
echo - Red LAN: http://%LAN_IP%:5173
echo Backend:
echo - Local: http://localhost:8000
echo - Red LAN: http://%LAN_IP%:8000
echo.

endlocal
