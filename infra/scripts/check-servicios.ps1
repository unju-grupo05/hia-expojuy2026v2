# =============================================================================
# ExpoJuy 2026 - Chequeo rapido de servicios (solo lectura: no cambia nada)
# Dice que modos estan levantados (A base, B cluster HA, C herramientas,
# D monitoreo), que servicios faltan y si hay errores criticos.
#
# Uso (desde infra/):
#   powershell -ExecutionPolicy Bypass -File scripts/check-servicios.ps1
#
# Codigo de salida: 0 = todo OK, 1 = avisos, 2 = errores criticos.
# No lee ni muestra secretos: de infra/.env solo toma puertos y PUBLIC_URL.
# =============================================================================

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..\.env'

function Get-EnvValue([string]$key, [string]$default) {
    if (Test-Path $envFile) {
        $line = Select-String -Path $envFile -Pattern "^$key=" | Select-Object -First 1
        if ($line) {
            $value = $line.Line.Split('=', 2)[1].Trim()
            if ($value) { return $value }
        }
    }
    return $default
}

function Get-HttpCode([string]$url) {
    $code = curl.exe -s -o NUL -m 8 -w "%{http_code}" $url
    if (-not $code) { return '000' }
    return $code
}

$criticos = New-Object System.Collections.Generic.List[string]
$avisos = New-Object System.Collections.Generic.List[string]

# --- Estado de los contenedores del proyecto -------------------------------
# --format json en vez de una plantilla con comillas: Windows PowerShell 5.1 quita las
# comillas internas de los argumentos y la plantilla {{.Label "..."}} llega rota a Docker.
$raw = docker ps -a --filter "label=com.docker.compose.project=expojuy" --format json
if ($LASTEXITCODE -ne 0) {
    Write-Host 'CRITICO: no se pudo consultar Docker. Esta abierto Docker Desktop?' -ForegroundColor Red
    exit 2
}

$servicios = @{}
foreach ($l in $raw) {
    if (-not $l) { continue }
    $c = $l | ConvertFrom-Json
    if ($c.Labels -match '(?:^|,)com\.docker\.compose\.service=([^,]+)') {
        $servicios[$Matches[1]] = [pscustomobject]@{ State = $c.State; Status = $c.Status; Ports = $c.Ports }
    }
}

$modos = [ordered]@{
    'A - Base'         = @('postgres', 'backend', 'frontend', 'pgadmin', 'backup')
    'B - Cluster HA'   = @('postgres-replica-1', 'postgres-replica-2', 'db-failover-manager', 'db-loadbalancer')
    'C - Herramientas' = @('tools-db', 'mantis', 'nextcloud')
    'D - Monitoreo'    = @('prometheus', 'grafana', 'node-exporter', 'cadvisor', 'postgres-exporter-primary', 'postgres-exporter-replica-1', 'postgres-exporter-replica-2')
}

Write-Host "`n=== Modos ===" -ForegroundColor Cyan
$modoActivo = @{}
foreach ($modo in $modos.Keys) {
    $presentes = @($modos[$modo] | Where-Object { $servicios.ContainsKey($_) })
    if ($presentes.Count -eq 0) {
        Write-Host ("{0,-18} apagado" -f $modo) -ForegroundColor DarkGray
        $modoActivo[$modo] = $false
        continue
    }
    $modoActivo[$modo] = $true
    $problemas = @()
    foreach ($s in $modos[$modo]) {
        if (-not $servicios.ContainsKey($s)) { $problemas += "$s (falta)"; continue }
        $c = $servicios[$s]
        if ($c.State -ne 'running') { $problemas += "$s ($($c.State))"; continue }
        if ($c.Status -match '\(unhealthy\)') { $problemas += "$s (unhealthy)"; continue }
        if ($c.Status -match 'health: starting') { $avisos.Add("$s todavia arrancando (health: starting)") }
    }
    if ($problemas.Count -eq 0) {
        Write-Host ("{0,-18} completo ({1}/{1})" -f $modo, $modos[$modo].Count) -ForegroundColor Green
    } else {
        Write-Host ("{0,-18} con problemas: {1}" -f $modo, ($problemas -join ', ')) -ForegroundColor Red
        foreach ($pr in $problemas) { $criticos.Add("[$modo] $pr") }
    }
}

# --- Puertos: solo 127.0.0.1, salvo el frontend (hallazgo conocido) --------
foreach ($s in $servicios.Keys) {
    $ports = $servicios[$s].Ports
    if ($ports -match '0\.0\.0\.0:|\[::\]:') {
        if ($s -eq 'frontend') { $avisos.Add('frontend publicado en 0.0.0.0 (accesible desde la red local)') }
        else { $criticos.Add("$s publicado fuera de 127.0.0.1: $ports") }
    }
}

# --- Backend: salud y a que base apunta -------------------------------------
Write-Host "`n=== Endpoints ===" -ForegroundColor Cyan
$frontPort = Get-EnvValue 'FRONTEND_PORT' '8080'
$checks = New-Object System.Collections.Generic.List[object]
if ($modoActivo['A - Base']) {
    $checks.Add(@('App /api/health', "http://localhost:$frontPort/api/health", '200', $true))
    $publicUrl = Get-EnvValue 'PUBLIC_URL' ''
    if ($publicUrl -match '^https://') { $checks.Add(@('App publica', "$publicUrl/api/health", '200', $false)) }
}
if ($modoActivo['B - Cluster HA']) {
    $checks.Add(@('Sentinel /health', "http://127.0.0.1:$(Get-EnvValue 'HA_SENTINEL_PORT' '8008')/health", '200', $true))
    $checks.Add(@('HAProxy /stats', "http://127.0.0.1:$(Get-EnvValue 'HA_PROXY_STATS_PORT' '8404')/stats", '401', $false))
}
if ($modoActivo['C - Herramientas']) {
    # 2xx o 3xx: segun su estado redirigen al login o al instalador (Mantis recien creado responde 307).
    $checks.Add(@('Mantis', "http://127.0.0.1:$(Get-EnvValue 'MANTIS_PORT' '8082')/", '2\d\d|3\d\d', $false))
    $checks.Add(@('Nextcloud', "http://127.0.0.1:$(Get-EnvValue 'NEXTCLOUD_PORT' '8083')/", '2\d\d|3\d\d', $false))
}
if ($modoActivo['D - Monitoreo']) {
    $checks.Add(@('Prometheus', 'http://127.0.0.1:9090/-/healthy', '200', $false))
    $checks.Add(@('Grafana', 'http://127.0.0.1:3001/api/health', '200', $false))
}
foreach ($c in $checks) {
    $code = Get-HttpCode $c[1]
    if ($code -match "^($($c[2]))$") {
        Write-Host ("OK     {0,-18} {1}" -f $c[0], $code) -ForegroundColor Green
    } else {
        Write-Host ("FALLA  {0,-18} {1} (esperado {2})  {3}" -f $c[0], $code, $c[2], $c[1]) -ForegroundColor Red
        $msg = "$($c[0]) responde $code (esperado $($c[2]))"
        if ($c[3]) { $criticos.Add($msg) } else { $avisos.Add($msg) }
    }
}

if ($servicios.ContainsKey('backend')) {
    $dbHost = (docker inspect expojuy-backend-1 --format '{{range .Config.Env}}{{println .}}{{end}}' |
        Select-String '^DB_HOST=' | Select-Object -First 1).Line -replace '^DB_HOST=', ''
    Write-Host ("Backend -> DB_HOST={0}" -f $dbHost)
    if ($modoActivo['B - Cluster HA'] -and $dbHost -ne 'db-loadbalancer') {
        $avisos.Add('El cluster HA esta levantado pero el backend va directo a postgres: repetir el up incluyendo -f compose.cluster-ha.yaml')
    }
    if (-not $modoActivo['B - Cluster HA'] -and $dbHost -eq 'db-loadbalancer') {
        $criticos.Add('El backend apunta a db-loadbalancer pero el cluster HA no esta levantado: correr docker compose up -d')
    }
}

# --- Resumen ------------------------------------------------------------------
Write-Host "`n=== Resumen ===" -ForegroundColor Cyan
foreach ($m in $criticos) { Write-Host "CRITICO: $m" -ForegroundColor Red }
foreach ($m in $avisos) { Write-Host "AVISO:   $m" -ForegroundColor Yellow }
if ($criticos.Count -gt 0) { Write-Host 'Resultado: ERRORES CRITICOS' -ForegroundColor Red; exit 2 }
if ($avisos.Count -gt 0) { Write-Host 'Resultado: OK con avisos' -ForegroundColor Yellow; exit 1 }
Write-Host 'Resultado: todo OK' -ForegroundColor Green
exit 0
