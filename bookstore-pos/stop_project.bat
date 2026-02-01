@echo off
setlocal

REM Stop frontend on port 5173
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173" ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>&1
)

REM Stop backend on port 8000
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>&1
)

echo Procesos detenidos (si estaban en 5173/8000).
endlocal
