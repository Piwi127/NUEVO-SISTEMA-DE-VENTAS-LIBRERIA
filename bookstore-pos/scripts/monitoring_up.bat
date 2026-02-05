@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%..\\monitoring"

docker compose -f docker-compose.monitoring.yml up -d
if errorlevel 1 (
  echo [ERROR] No se pudo levantar Prometheus/Grafana. Verifica Docker Desktop.
  pause
  exit /b 1
)

echo Prometheus: http://localhost:9090
echo Grafana: http://localhost:3001  ^(admin/admin^)
endlocal
