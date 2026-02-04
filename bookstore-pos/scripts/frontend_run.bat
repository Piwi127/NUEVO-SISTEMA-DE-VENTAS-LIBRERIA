@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\frontend"
call npm.cmd install --no-audit --no-fund
if not exist .env (
  copy .env.example .env
)
call npm.cmd run dev
endlocal
