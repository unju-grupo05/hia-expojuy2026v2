# =============================================================================
# ExpoJuy 2026 - Despliegue continuo (CD) en la notebook, con rollback automatico.
#
# 1. Pregunta a GitHub cual es el ultimo commit de la rama con el CI en verde.
# 2. Si es distinto del que corre, baja sus imagenes de Docker Hub (tag = commit).
# 3. Recrea solo backend y frontend y espera a que /api/health responda "ok".
# 4. Si no responde, vuelve a las imagenes anteriores (rollback) y anota el commit
#    como fallido para no reintentarlo.
#
# Uso (desde cualquier carpeta):
#   powershell -ExecutionPolicy Bypass -File infra/scripts/cd-deploy.ps1                 # rama main
#   powershell -ExecutionPolicy Bypass -File infra/scripts/cd-deploy.ps1 -Rama develop
#   powershell -ExecutionPolicy Bypass -File infra/scripts/cd-deploy.ps1 -Tag <sha>      # version puntual (rollback manual)
#
# Codigo de salida: 0 desplegado o sin cambios, 1 error. Registro en infra/cd-deploy.log.
# Ver docs/CD_DESPLIEGUE.md.
# =============================================================================
[CmdletBinding()]
param(
    [string]$Rama = 'main',
    [string]$Tag
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo      = 'unju-grupo05/hia-expojuy2026v2'
$Registro  = 'lautarocano'                       # cuenta de Docker Hub donde publica el CI
$Health    = 'http://127.0.0.1:8080/api/health'  # pasa por el frontend (nginx) hasta el backend
$Infra     = Split-Path $PSScriptRoot -Parent
$Log       = Join-Path $Infra 'cd-deploy.log'
$Fallidos  = Join-Path $Infra 'cd-fallidos.txt'
# Con el HA: el backend sigue conectado a HAProxy (compose.cluster-ha.yaml)
$Compose   = @('-f', 'compose.yaml', '-f', 'compose.cluster-ha.yaml', '-f', 'compose.deploy.yaml')

function Log([string]$Mensaje) {
    $linea = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Mensaje
    Write-Host $linea
    Add-Content -Path $Log -Value $linea -Encoding ascii
}

function ImagenActual([string]$Contenedor) {
    docker inspect $Contenedor --format '{{.Config.Image}}'
}

# Recrea backend y frontend con las imagenes dadas y espera hasta 60 s a que la API responda.
function Desplegar([string]$Backend, [string]$Frontend) {
    $env:BACKEND_IMAGE = $Backend
    $env:FRONTEND_IMAGE = $Frontend
    # Out-Host: la salida de docker va a la pantalla y no se mezcla con el valor que devuelve la funcion
    docker compose @Compose up -d --no-deps backend frontend | Out-Host
    if ($LASTEXITCODE -ne 0) { return $false }
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep -Seconds 5
        try {
            if ((Invoke-RestMethod $Health -TimeoutSec 5).status -eq 'ok') { return $true }
        } catch { }
    }
    return $false
}

Set-Location $Infra
$manual = [bool]$Tag

# 1. Ultimo commit de la rama con el CI en verde (API publica de GitHub, sin token)
if (-not $manual) {
    $api = "https://api.github.com/repos/$Repo/actions/workflows/ci-cd.yml/runs?branch=$Rama&event=push&status=success&per_page=1"
    $run = @((Invoke-RestMethod $api -Headers @{ 'User-Agent' = 'expojuy-cd' }).workflow_runs)[0]
    if (-not $run) { Write-Host "Sin ejecuciones del CI en verde para '$Rama'."; exit 0 }
    $Tag = $run.head_sha
}

$backend  = "$Registro/expojuy-backend:$Tag"
$frontend = "$Registro/expojuy-frontend:$Tag"
$antesBackend  = ImagenActual 'expojuy-backend-1'
$antesFrontend = ImagenActual 'expojuy-frontend-1'

if ($antesBackend -eq $backend -and $antesFrontend -eq $frontend) {
    Write-Host "Sin cambios: ya corre $Tag."
    exit 0
}
if (-not $manual -and (Test-Path $Fallidos) -and (Select-String -Path $Fallidos -Pattern $Tag -SimpleMatch -Quiet)) {
    Write-Host "$Tag fallo antes y no se reintenta (ver $Fallidos)."
    exit 0
}

# 2. Bajar las imagenes antes de tocar nada: si falla, la version actual sigue andando
Log "Desplegando $Tag (rama $Rama). Antes: $antesBackend"
foreach ($img in $backend, $frontend) {
    docker pull $img
    if ($LASTEXITCODE -ne 0) { Log "ERROR: no se pudo bajar $img. No se cambio nada."; exit 1 }
}

# 3. Desplegar y verificar
if (Desplegar $backend $frontend) {
    Log "OK: $Tag desplegado; /api/health responde ok."
    exit 0
}

# 4. Rollback a las imagenes anteriores
Log "FALLO: /api/health no responde con $Tag. Rollback a $antesBackend"
Add-Content -Path $Fallidos -Value $Tag -Encoding ascii
if (Desplegar $antesBackend $antesFrontend) {
    Log "Rollback OK: vuelve a correr la version anterior."
} else {
    Log "ERROR: el rollback tambien fallo. Revisar con: docker logs expojuy-backend-1"
}
exit 1
