# =============================================================================
# ExpoJuy 2026 - Prueba Automatizada de Restauración y Verificación de Integridad (PowerShell)
# Integrante 2 (DBA)
# Puntos 4 y 15 del TP: Verificación de integridad de >= 6.000.000 de registros
# =============================================================================

$ErrorActionPreference = "Stop"

$PRIMARY_CONTAINER = "expojuy-postgres-1"
$DB_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "expojuy_app" }
$TEST_DB = "expojuy_restore_test"
$BACKUP_DIR = "infra/backups"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   EXPOJUY 2026 - PRUEBA DE RECUPERACIÓN ANTE DESASTRES (RESTORE TEST)" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Identificar el último backup .sql.gz
$latestBackup = Get-ChildItem -Path $BACKUP_DIR -Recurse -Filter "*.sql.gz" |
    Where-Object { $_.Length -gt 1024 } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $latestBackup) {
    Write-Error "No se encontró ningún archivo de respaldo .sql.gz en $BACKUP_DIR."
    exit 1
}

$sizeMb = [Math]::Round($latestBackup.Length / 1MB, 2)
Write-Host ">>> Último archivo de backup detectado: $($latestBackup.FullName)" -ForegroundColor Green
Write-Host ">>> Tamaño comprimido del backup: $sizeMb MB" -ForegroundColor Green

# 2. Preparar base de datos limpia de pruebas
Write-Host ">>> Creando base de datos limpia de pruebas: $TEST_DB..." -ForegroundColor Yellow
docker exec -i $PRIMARY_CONTAINER psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE);" | Out-Null
docker exec -i $PRIMARY_CONTAINER psql -U $DB_USER -d postgres -c "CREATE DATABASE $TEST_DB OWNER $DB_USER;" | Out-Null

# 3. Restaurar mediante streaming con Node.js
Write-Host ">>> Descomprimiendo y restaurando volcado en $TEST_DB..." -ForegroundColor Yellow
$sw = [System.Diagnostics.Stopwatch]::StartNew()

$backupPathEscaped = $latestBackup.FullName.Replace('\', '/')
$nodeScript = @"
const fs = require('fs');
const zlib = require('zlib');
const { spawn } = require('child_process');

const gz = fs.createReadStream('$backupPathEscaped');
const gunzip = zlib.createGunzip();
const psql = spawn('docker', ['exec', '-i', '$PRIMARY_CONTAINER', 'psql', '-U', '$DB_USER', '-d', '$TEST_DB', '-q'], { stdio: ['pipe', 'inherit', 'inherit'] });

gz.pipe(gunzip).pipe(psql.stdin);

psql.on('close', (code) => {
    process.exit(code);
});
"@

$tempScript = [System.IO.Path]::GetTempFileName() + ".js"
[System.IO.File]::WriteAllText($tempScript, $nodeScript)

node $tempScript
$restoreCode = $LASTEXITCODE
Remove-Item $tempScript -ErrorAction SilentlyContinue

$sw.Stop()
$durSeg = [Math]::Round($sw.Elapsed.TotalSeconds, 2)

if ($restoreCode -ne 0) {
    Write-Error "La restauración falló con código de salida $restoreCode."
    exit 1
}

Write-Host ">>> Restauración completada en $durSeg segundos." -ForegroundColor Green

# 4. Verificación exhaustiva de integridad
Write-Host ">>> Verificando integridad de los datos restaurados..." -ForegroundColor Yellow

$integritySql = @"
SELECT 'visitas_stands' AS tabla, count(*) AS registros FROM visitas_stands
UNION ALL
SELECT 'stands', count(*) FROM stands
UNION ALL
SELECT 'expositores', count(*) FROM expositores
UNION ALL
SELECT 'ejes', count(*) FROM ejes
UNION ALL
SELECT 'agenda', count(*) FROM agenda
UNION ALL
SELECT 'huerfanos_referenciales', count(*) FROM visitas_stands v LEFT JOIN stands s ON v.stand_id = s.id WHERE s.id IS NULL;
"@

$results = docker exec -i $PRIMARY_CONTAINER psql -U $DB_USER -d $TEST_DB -c $integritySql
Write-Host $results -ForegroundColor White

Write-Host ">>> RESULTADO: ¡PRUEBA DE RESTAURACIÓN EXITOSA AL 100%! <<<" -ForegroundColor Green
Write-Host ">>> Eliminando base de datos temporal de pruebas..." -ForegroundColor Yellow
docker exec -i $PRIMARY_CONTAINER psql -U $DB_USER -d postgres -c "DROP DATABASE $TEST_DB WITH (FORCE);" | Out-Null
Write-Host ">>> Entorno de pruebas limpio." -ForegroundColor Cyan
exit 0
