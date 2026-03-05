@echo off
setlocal

powershell -NoProfile -Command ^
  "$ports = @(5173,8000);" ^
  "$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort };" ^
  "$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique;" ^
  "if (-not $pids) { Write-Output '[INFO] No hay procesos escuchando en 5173/8000.'; exit 0 };" ^
  "foreach ($procId in $pids) {" ^
  "  $stopped = $false;" ^
  "  try { Stop-Process -Id $procId -Force -ErrorAction Stop; $stopped = $true; Write-Output ('[OK] Detenido PID {0}.' -f $procId) }" ^
  "  catch {" ^
  "    $taskKill = Start-Process -FilePath 'taskkill.exe' -ArgumentList ('/F /T /PID ' + $procId) -NoNewWindow -Wait -PassThru;" ^
  "    if ($taskKill.ExitCode -eq 0) { $stopped = $true; Write-Output ('[OK] Detenido PID {0} via taskkill.' -f $procId) }" ^
  "    else { Write-Output ('[WARN] No se pudo detener PID {0}: {1}' -f $procId, $_.Exception.Message) }" ^
  "  }" ^
  "};" ^
  "Start-Sleep -Milliseconds 300;" ^
  "$remaining = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort } | Select-Object LocalAddress,LocalPort,OwningProcess -Unique;" ^
  "if ($remaining) { Write-Output '[WARN] Aun quedan listeners activos:'; $remaining | Format-Table -AutoSize } else { Write-Output '[OK] Procesos detenidos en 5173/8000.' }"

endlocal
