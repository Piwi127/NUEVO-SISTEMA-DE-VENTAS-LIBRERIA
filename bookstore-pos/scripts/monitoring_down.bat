@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\monitoring"

docker compose -f docker-compose.monitoring.yml down
if errorlevel 1 (
  echo [ERROR] No se pudo detener Prometheus/Grafana.
  pause
  exit /b 1
)

echo Monitoreo detenido.
endlocal
