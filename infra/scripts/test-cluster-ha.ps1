# =============================================================================
# ExpoJuy 2026 - Verificación Integral del Clúster HA de 3 Nodos (PowerShell)
# Integrante 2 (DBA)
# =============================================================================

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ">>> [1/4] Consultando Estado del Clúster en Sentinel API (Puerto 8008)..." -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
try {
    $status = Invoke-RestMethod -Uri "http://127.0.0.1:8008/cluster/status" -Method Get
    Write-Host "Líder Actual (Primary):" $status.primary "($($status.primaryHost))" -ForegroundColor Green
    Write-Host "Timeline ID:" $status.primaryTimeline -ForegroundColor Green
    Write-Host "Incidentes de Failover:" $status.failoverCount -ForegroundColor Green
    Write-Host "Estado de Nodos:" -ForegroundColor Yellow
    $status.nodes.PSObject.Properties | ForEach-Object {
        $n = $_.Value
        Write-Host "  - $($n.id): Host=$($n.host), Role=$($n.role), Alive=$($n.isAlive), Standby=$($n.isRecovery), Timeline=$($n.timelineId), LSN=$($n.lsn)"
    }
} catch {
    Write-Host "Error conectando con Sentinel API: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ">>> [2/4] Probando Enrutamiento de Escritura en HAProxy (Puerto 5437 / 5432)..." -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
docker run --rm --network expojuy_data -e PGPASSWORD=G7Fw6Q2JDATv9N8sk0fmMxgia4XjRBIE pgvector/pgvector:pg17 `
  psql -h db-loadbalancer -p 5432 -U expojuy_app -d expojuy -c `
  "SELECT inet_server_addr() AS ip_nodo_escritura, pg_is_in_recovery() AS es_standby, current_timestamp AS timestamp_escritura;"

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ">>> [3/4] Probando Balanceo de Carga de Lectura en Round-Robin (6 consultas)..." -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
1..6 | ForEach-Object {
    $i = $_
    $res = docker run --rm --network expojuy_data -e PGPASSWORD=G7Fw6Q2JDATv9N8sk0fmMxgia4XjRBIE pgvector/pgvector:pg17 `
      psql -h db-loadbalancer -p 5436 -U expojuy_app -d expojuy -t -A -c `
      "SELECT 'Query ' || $i || ' -> Nodo IP: ' || inet_server_addr() || ' | Standby: ' || pg_is_in_recovery();"
    Write-Host $res -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ">>> [4/4] Métricas y Dashboard HAProxy" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Dashboard Web: http://127.0.0.1:8404/stats (admin / expojuy_ha_secret_2026)" -ForegroundColor Cyan
Write-Host "Sentinel API:  http://127.0.0.1:8008/cluster/status" -ForegroundColor Cyan
Write-Host ">>> Verificación completada con éxito." -ForegroundColor Green
