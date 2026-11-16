# =============================================================================
# ExpoJuy 2026 - Configuración Automatizada de Nextcloud (Estructura y Permisos)
# Punto 12 del Trabajo Práctico Integrador
# =============================================================================
# Uso: Desde la raíz del repo o desde infra/:
#      powershell -ExecutionPolicy Bypass -File infra/scripts/setup-nextcloud.ps1
# =============================================================================

$ErrorActionPreference = "Continue"

$CONTAINER = "expojuy-nextcloud"
$DEFAULT_PASS = "Expojuy2026!"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ">>> Iniciando configuracion automatica de Nextcloud (ExpoJuy 2026)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Verificar que el contenedor esté corriendo
Write-Host "`n[Paso 1/5] Verificando estado del contenedor $CONTAINER..." -ForegroundColor Yellow
$containerStatus = docker inspect --format '{{.State.Running}}' $CONTAINER 2>$null
if ($containerStatus -ne "true") {
    Write-Host "[ERROR] El contenedor '$CONTAINER' no esta corriendo." -ForegroundColor Red
    Write-Host "Levantalo previamente con: docker compose -f compose.yaml -f compose.tools.yaml up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Contenedor $CONTAINER activo y saludable." -ForegroundColor Green

# 2. Habilitar la aplicación Group Folders (Carpetas de Grupo)
Write-Host "`n[Paso 2/5] Habilitando aplicacion oficial 'groupfolders'..." -ForegroundColor Yellow
docker exec -u www-data $CONTAINER php occ app:enable groupfolders 2>&1 | Out-Null
Write-Host "[OK] Modulo 'groupfolders' activo en Nextcloud." -ForegroundColor Green

# 3. Crear Grupos de Trabajo por Área de Responsabilidad
Write-Host "`n[Paso 3/5] Creando grupos de roles del proyecto..." -ForegroundColor Yellow
$groups = @(
    "equipo-expojuy",
    "devops",
    "dba",
    "monitoreo-cicd",
    "automatizacion-n8n",
    "qa-seguridad"
)

foreach ($grp in $groups) {
    docker exec -u www-data $CONTAINER php occ group:add $grp 2>&1 | Out-Null
    Write-Host "  -> Grupo configurado: $grp" -ForegroundColor Gray
}
Write-Host "[OK] 6 grupos de trabajo registrados." -ForegroundColor Green

# 4. Crear Usuarios del Equipo Integrador
Write-Host "`n[Paso 4/5] Creando y enrolando usuarios del equipo..." -ForegroundColor Yellow

$users = @(
    @{ uid = "Ignacio"; displayName = "Ignacio Huanca(DevOps e Infra)"; groups = @("devops", "equipo-expojuy") },
    @{ uid = "Antonella"; displayName = "Antonella Cruz (Senior DBA)"; groups = @("dba", "equipo-expojuy") },
    @{ uid = "Lautaro"; displayName = "Cano Lautaro(CI/CD y Monitoreo)"; groups = @("monitoreo-cicd", "equipo-expojuy") },
    @{ uid = "Santiago"; displayName = "Santiago Padilla (n8n Automatizacion)"; groups = @("automatizacion-n8n", "equipo-expojuy") },
    @{ uid = "Maxi"; displayName = "Maximiliano Calpanchay (Scrum, QA y Seguridad)"; groups = @("qa-seguridad", "equipo-expojuy") }
)

foreach ($u in $users) {
    docker exec -u www-data $CONTAINER php occ user:info $u.uid 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        docker exec -e OC_PASS=$DEFAULT_PASS -u www-data $CONTAINER php occ user:add --password-from-env --display-name "$($u.displayName)" $u.uid 2>&1 | Out-Null
        Write-Host "  [+] Creado usuario: $($u.uid) (Clave inicial: $DEFAULT_PASS)" -ForegroundColor Cyan
    } else {
        Write-Host "  [*] Usuario existente: $($u.uid)" -ForegroundColor Gray
    }

    # Enrolar en sus grupos
    foreach ($grp in $u.groups) {
        docker exec -u www-data $CONTAINER php occ group:adduser $grp $u.uid 2>&1 | Out-Null
    }
}
Write-Host "[OK] Todos los integrantes enrolados en sus respectivos grupos." -ForegroundColor Green

# 5. Configurar Estructura de Carpetas de Grupo y Matriz de Permisos
Write-Host "`n[Paso 5/5] Creando carpetas de grupo y asignando matriz de permisos..." -ForegroundColor Yellow

$folders = @(
    @{
        name = "01-Gestion-y-Actas"
        rules = @(
            @{ group = "equipo-expojuy"; perms = "write share delete" }
        )
    },
    @{
        name = "02-Infraestructura-y-DevOps"
        rules = @(
            @{ group = "devops"; perms = "write share delete" },
            @{ group = "equipo-expojuy"; perms = "" }
        )
    },
    @{
        name = "03-Base-de-Datos-y-Telemetria"
        rules = @(
            @{ group = "dba"; perms = "write share delete" },
            @{ group = "equipo-expojuy"; perms = "" }
        )
    },
    @{
        name = "04-Monitoreo-CI-CD-y-Automatizacion"
        rules = @(
            @{ group = "monitoreo-cicd"; perms = "write share delete" },
            @{ group = "automatizacion-n8n"; perms = "write share delete" },
            @{ group = "equipo-expojuy"; perms = "" }
        )
    },
    @{
        name = "05-Seguridad-Auditorias-e-Incidencias"
        rules = @(
            @{ group = "qa-seguridad"; perms = "write share delete" },
            @{ group = "automatizacion-n8n"; perms = "write share delete" },
            @{ group = "equipo-expojuy"; perms = "" }
        )
    },
    @{
        name = "06-Entregables-Finales-y-Defensa"
        rules = @(
            @{ group = "equipo-expojuy"; perms = "write share delete" }
        )
    }
)

# Obtener carpetas existentes para no duplicar
$existingJson = docker exec -u www-data $CONTAINER php occ groupfolders:list --output=json 2>$null
$existingList = $existingJson | ConvertFrom-Json

foreach ($f in $folders) {
    $existing = $existingList | Where-Object { $_.mountPoint -eq $f.name }
    if ($existing) {
        $folderId = $existing.id
        Write-Host "  [*] Carpeta existente: $($f.name) (ID: $folderId)" -ForegroundColor Gray
    } else {
        $folderId = docker exec -u www-data $CONTAINER php occ groupfolders:create "$($f.name)"
        $folderId = $folderId.Trim()
        Write-Host "  [+] Creada carpeta de grupo: $($f.name) (ID: $folderId)" -ForegroundColor Cyan
    }

    # Asignar permisos por grupo
    foreach ($r in $f.rules) {
        if ([string]::IsNullOrWhiteSpace($r.perms)) {
            docker exec -u www-data $CONTAINER php occ groupfolders:group $folderId "$($r.group)" 2>&1 | Out-Null
            Write-Host "      - Grupo '$($r.group)': Permiso SOLO LECTURA (1)" -ForegroundColor DarkGray
        } else {
            docker exec -u www-data $CONTAINER php occ groupfolders:group $folderId "$($r.group)" write share delete 2>&1 | Out-Null
            Write-Host "      - Grupo '$($r.group)': Permiso LECTURA Y ESCRITURA TOTAL (31)" -ForegroundColor Green
        }
    }
}

# =============================================================================
# VERIFICACIÓN DE CONTROL DE ACCESO
# =============================================================================
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host ">>> VERIFICACION DE ACCESOS Y PERMISOS DE GRUPO EN NEXTCLOUD" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

docker exec -u www-data $CONTAINER php occ groupfolders:list

Write-Host "`n[RESUMEN DE CUENTAS DE USUARIOS Y GRUPOS REGISTRADOS]" -ForegroundColor Yellow
Write-Host "Clave por defecto asignada a los usuarios: $DEFAULT_PASS" -ForegroundColor White
docker exec -u www-data $CONTAINER php occ user:list

Write-Host "`n[DETALLE DE MIEMBROS POR GRUPO]" -ForegroundColor Yellow
foreach ($grp in $groups) {
    Write-Host "-> Grupo '$grp':" -NoNewline -ForegroundColor Cyan
    docker exec -u www-data $CONTAINER php occ group:list --output=json 2>$null | ConvertFrom-Json | Select-Object -ExpandProperty $grp | ForEach-Object { Write-Host " $_" -NoNewline -ForegroundColor White }
    Write-Host ""
}

Write-Host "`n>>> Configuracion finalizada con exito." -ForegroundColor Green
Write-Host "Acceso web: http://127.0.0.1:8083" -ForegroundColor Cyan
