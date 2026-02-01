@echo off
setlocal
set ROOT=%~dp0

start "Backend" cmd /k "%ROOT%backend_run.bat"
start "Frontend" cmd /k "%ROOT%frontend_run.bat"

endlocal
