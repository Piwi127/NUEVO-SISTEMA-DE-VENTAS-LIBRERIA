@echo off
setlocal enabledelayedexpansion

echo [FASE 1] Validacion integral de calidad
echo.

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%"

set "PY_CMD="
if exist "%ROOT_DIR%\backend\.venv\Scripts\python.exe" (
  set "PY_CMD="%ROOT_DIR%\backend\.venv\Scripts\python.exe""
) else (
  set "PY_CMD=py -3"
)

echo [1/2] Backend: dependencias, lint y tests
pushd backend
call %PY_CMD% -m pip install --upgrade pip >nul
if errorlevel 1 goto :fail_backend

call %PY_CMD% -m pip install -r requirements.txt
if errorlevel 1 goto :fail_backend

call %PY_CMD% -m ruff check app tests
if errorlevel 1 goto :fail_backend

call %PY_CMD% -m pytest -q
if errorlevel 1 goto :fail_backend

call %PY_CMD% -m py_compile app\main.py app\routers\catalog\products.py app\routers\pos\printing.py
if errorlevel 1 goto :fail_backend
popd

echo.
echo [2/2] Frontend: lint, tests y build
where npm >nul 2>&1
if errorlevel 1 goto :missing_npm

pushd frontend
call npm ci
if errorlevel 1 goto :fail_frontend

call npm run lint
if errorlevel 1 goto :fail_frontend

call npm run test
if errorlevel 1 goto :fail_frontend

call npm run build
if errorlevel 1 goto :fail_frontend
popd

echo.
echo [OK] Fase 1 validada correctamente.
popd
exit /b 0

:missing_npm
echo.
echo [ERROR] npm no esta disponible en PATH.
echo Instala Node.js 20+ y vuelve a ejecutar este script.
popd
exit /b 1

:fail_backend
echo.
echo [ERROR] Fallo en validacion de backend.
popd
popd
exit /b 1

:fail_frontend
echo.
echo [ERROR] Fallo en validacion de frontend.
popd
popd
exit /b 1
