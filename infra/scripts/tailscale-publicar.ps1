# =============================================================================
# ExpoJuy 2026 - Publica las herramientas administrativas SOLO en la tailnet
# (Tailscale Serve). La aplicacion web sigue publica por Funnel en el puerto 443.
#
# Uso (desde cualquier carpeta):
#   powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1                      # estado
#   powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1 -Accion publicar     # todas
#   powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1 -Accion publicar -Servicio grafana
#   powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1 -Accion quitar -Servicio pgadmin
#
# Cada herramienta usa su propio puerto, nunca el 443: Funnel se habilita por puerto
# y una ruta en el 443 quedaria publica. Al final verifica que ningun puerto de
# Serve tenga Funnel activo. Codigo de salida: 0 OK, 1 error.
# =============================================================================
[CmdletBinding()]
param(
    [ValidateSet('estado', 'publicar', 'quitar')]
    [string]$Accion = 'estado',
    [string[]]$Servicio
)

$ErrorActionPreference = 'Stop'

# Servicio -> puerto local (el mismo numero se usa como puerto HTTPS en la tailnet)
$Servicios = [ordered]@{
    mantis     = 8082
    nextcloud  = 8083
    grafana    = 3001
    prometheus = 9090
    pgadmin    = 5050
    haproxy    = 8404
    n8n        = 5679   # solo el editor; los webhooks van por Funnel en el 8443 (ver PUBLICAR_HERRAMIENTAS.md)
}

if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
    Write-Host 'ERROR: no se encontro el comando tailscale. Esta instalado y en el PATH?' -ForegroundColor Red
    exit 1
}

$elegidos = @($Servicios.Keys)
if ($Servicio) {
    $desconocidos = @($Servicio | Where-Object { -not $Servicios.Contains($_) })
    if ($desconocidos.Count -gt 0) {
        Write-Host "ERROR: servicio desconocido: $($desconocidos -join ', '). Validos: $($Servicios.Keys -join ', ')" -ForegroundColor Red
        exit 1
    }
    $elegidos = $Servicio
}

# Nombre DNS de esta maquina en la tailnet (sin el punto final).
$self = (tailscale status --json | Out-String | ConvertFrom-Json).Self
$hostName = $self.DNSName.TrimEnd('.')

try {
    foreach ($s in $elegidos) {
        $p = $Servicios[$s]
        switch ($Accion) {
            'publicar' {
                tailscale serve --bg --https=$p "http://127.0.0.1:$p" | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "no se pudo publicar $s en el puerto $p" }
                Write-Host ("[OK]     {0,-11} https://{1}:{2}" -f $s, $hostName, $p) -ForegroundColor Green
            }
            'quitar' {
                tailscale serve --https=$p off | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "no se pudo quitar $s del puerto $p" }
                Write-Host ("[QUITADO] {0,-11} puerto {1}" -f $s, $p) -ForegroundColor Yellow
            }
        }
    }

    # Control de seguridad: ningun puerto de Serve puede tener Funnel (publico).
    $cfg = tailscale serve status --json | Out-String | ConvertFrom-Json
    $funnel = @()
    if ($cfg.AllowFunnel) { $funnel = @($cfg.AllowFunnel.PSObject.Properties | Where-Object { $_.Value } | ForEach-Object { $_.Name }) }
    $expuestos = @($funnel | Where-Object { $port = [int]($_ -split ':')[-1]; $Servicios.Values -contains $port })
    if ($expuestos.Count -gt 0) { throw "Funnel activo en un puerto administrativo: $($expuestos -join ', '). Quitarlo con: tailscale funnel --https=<puerto> off" }

    Write-Host "`n=== Estado ===" -ForegroundColor Cyan
    tailscale serve status
    Write-Host ("Funnel (publico): {0}" -f $(if ($funnel) { $funnel -join ', ' } else { 'ninguno' }))
    exit 0
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
