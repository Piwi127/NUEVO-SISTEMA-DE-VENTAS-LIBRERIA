@echo off
setlocal
set "ROOT=%~dp0"

call "%ROOT%stop_project.bat" >nul 2>&1
powershell -NoProfile -Command "Start-Sleep -Seconds 1" >nul

set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%get_lan_ip.ps1"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

start "Backend" cmd /k call "%ROOT%backend_run.bat"
start "Frontend" cmd /k call "%ROOT%frontend_run.bat"

set "BACKEND_READY=0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%wait_http.ps1" -Url "http://127.0.0.1:8000/health" -TimeoutSeconds 45 >nul 2>&1
if not errorlevel 1 set "BACKEND_READY=1"

set "FRONTEND_READY=0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%wait_http.ps1" -Url "http://127.0.0.1:5173" -TimeoutSeconds 60 >nul 2>&1
if not errorlevel 1 set "FRONTEND_READY=1"

echo.
if "%BACKEND_READY%"=="1" (
  echo [OK] Backend listo.
) else (
  echo [WARN] Backend no respondio en el tiempo esperado. Revisa la ventana "Backend".
)
if "%FRONTEND_READY%"=="1" (
  echo [OK] Frontend listo.
) else (
  echo [WARN] Frontend no respondio en el tiempo esperado. Revisa la ventana "Frontend".
)

echo.
echo Frontend:
echo - Local: http://localhost:5173
echo - Red LAN: http://%LAN_IP%:5173
echo Backend:
echo - Local: http://localhost:8000
echo - Red LAN: http://%LAN_IP%:8000
echo.

endlocal
