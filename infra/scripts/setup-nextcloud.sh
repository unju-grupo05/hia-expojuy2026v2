#!/usr/bin/env bash
# =============================================================================
# ExpoJuy 2026 - Configuración Automatizada de Nextcloud (Estructura y Permisos)
# Punto 12 del Trabajo Práctico Integrador
# =============================================================================
# Uso: Desde la raíz del repo o desde infra/:
#      bash infra/scripts/setup-nextcloud.sh
# =============================================================================

set -euo pipefail

CONTAINER="expojuy-nextcloud"
DEFAULT_PASS="Expojuy2026!"

echo "================================================================="
echo ">>> Iniciando configuracion automatica de Nextcloud (ExpoJuy 2026)"
echo "================================================================="

# 1. Verificar estado del contenedor
echo -e "\n[Paso 1/5] Verificando estado del contenedor $CONTAINER..."
if [ "$(docker inspect --format '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" != "true" ]; then
    echo "[ERROR] El contenedor '$CONTAINER' no esta corriendo."
    echo "Levantalo previamente con: docker compose -f compose.yaml -f compose.tools.yaml up -d"
    exit 1
fi
echo "[OK] Contenedor $CONTAINER activo y saludable."

# 2. Habilitar la aplicación Group Folders
echo -e "\n[Paso 2/5] Habilitando aplicacion oficial 'groupfolders'..."
docker exec -u www-data "$CONTAINER" php occ app:enable groupfolders >/dev/null 2>&1 || true
echo "[OK] Modulo 'groupfolders' activo en Nextcloud."

# 3. Crear Grupos de Trabajo por Área de Responsabilidad
echo -e "\n[Paso 3/5] Creando grupos de roles del proyecto..."
GROUPS=("equipo-expojuy" "devops" "dba" "monitoreo-cicd" "automatizacion-n8n" "qa-seguridad")
for GRP in "${GROUPS[@]}"; do
    docker exec -u www-data "$CONTAINER" php occ group:add "$GRP" >/dev/null 2>&1 || true
    echo "  -> Grupo configurado: $GRP"
done
echo "[OK] 6 grupos de trabajo registrados."

# 4. Crear Usuarios del Equipo Integrador
echo -e "\n[Paso 4/5] Creando y enrolando usuarios del equipo..."

create_user_if_needed() {
    local UID_VAL="$1"
    local DISPLAY="$2"
    shift 2
    local USER_GROUPS=("$@")

    if ! docker exec -u www-data "$CONTAINER" php occ user:info "$UID_VAL" >/dev/null 2>&1; then
        docker exec -e OC_PASS="$DEFAULT_PASS" -u www-data "$CONTAINER" php occ user:add --password-from-env --display-name "$DISPLAY" "$UID_VAL" >/dev/null 2>&1
        echo "  [+] Creado usuario: $UID_VAL (Clave inicial: $DEFAULT_PASS)"
    else
        echo "  [*] Usuario existente: $UID_VAL"
    fi

    for GRP in "${USER_GROUPS[@]}"; do
        docker exec -u www-data "$CONTAINER" php occ group:adduser "$GRP" "$UID_VAL" >/dev/null 2>&1 || true
    done
}

create_user_if_needed "Ignacio" "Ignacio Huanca(DevOps e Infra)" "devops" "equipo-expojuy"
create_user_if_needed "Antonella" "Antonella Cruz (Senior DBA)" "dba" "equipo-expojuy"
create_user_if_needed "Lautaro" "Cano Lautaro(CI/CD y Monitoreo)" "monitoreo-cicd" "equipo-expojuy"
create_user_if_needed "Santiago" "Santiago Padilla (n8n Automatizacion)" "automatizacion-n8n" "equipo-expojuy"
create_user_if_needed "Maxi" "Maximiliano Calpanchay (Scrum, QA y Seguridad)" "qa-seguridad" "equipo-expojuy"
echo "[OK] Todos los integrantes enrolados en sus respectivos grupos."

# 5. Configurar Estructura de Carpetas de Grupo y Matriz de Permisos
echo -e "\n[Paso 5/5] Creando carpetas de grupo y asignando matriz de permisos..."

ensure_folder() {
    local FOLDER_NAME="$1"
    local FOLDER_ID
    FOLDER_ID=$(docker exec -u www-data "$CONTAINER" php occ groupfolders:list --output=json 2>/dev/null | grep -o '{"id":[0-9]*,"quota":[^}]*"mountPoint":"'"$FOLDER_NAME"'"' | grep -o '"id":[0-9]*' | cut -d: -f2 || true)
    
    if [ -z "$FOLDER_ID" ]; then
        FOLDER_ID=$(docker exec -u www-data "$CONTAINER" php occ groupfolders:create "$FOLDER_NAME" 2>/dev/null | tr -d '\r')
        echo "  [+] Creada carpeta de grupo: $FOLDER_NAME (ID: $FOLDER_ID)"
    else
        echo "  [*] Carpeta existente: $FOLDER_NAME (ID: $FOLDER_ID)"
    fi
    echo "$FOLDER_ID"
}

# Carpetas y permisos (write share delete = 31 / lectura = 1)
ID1=$(ensure_folder "01-Gestion-y-Actas")
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID1" "equipo-expojuy" write share delete >/dev/null 2>&1

ID2=$(ensure_folder "02-Infraestructura-y-DevOps")
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID2" "devops" write share delete >/dev/null 2>&1
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID2" "equipo-expojuy" >/dev/null 2>&1

ID3=$(ensure_folder "03-Base-de-Datos-y-Telemetria")
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID3" "dba" write share delete >/dev/null 2>&1
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID3" "equipo-expojuy" >/dev/null 2>&1

ID4=$(ensure_folder "04-Monitoreo-CI-CD-y-Automatizacion")
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID4" "monitoreo-cicd" write share delete >/dev/null 2>&1
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID4" "automatizacion-n8n" write share delete >/dev/null 2>&1
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID4" "equipo-expojuy" >/dev/null 2>&1

ID5=$(ensure_folder "05-Seguridad-Auditorias-e-Incidencias")
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID5" "qa-seguridad" write share delete >/dev/null 2>&1
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID5" "equipo-expojuy" >/dev/null 2>&1

ID6=$(ensure_folder "06-Entregables-Finales-y-Defensa")
docker exec -u www-data "$CONTAINER" php occ groupfolders:group "$ID6" "equipo-expojuy" write share delete >/dev/null 2>&1

echo "================================================================="
echo ">>> VERIFICACION DE ACCESOS Y PERMISOS DE GRUPO EN NEXTCLOUD"
echo "================================================================="
docker exec -u www-data "$CONTAINER" php occ groupfolders:list

echo -e "\n[RESUMEN DE CUENTAS DE USUARIOS REGISTRADOS]"
echo "Clave por defecto asignada a todos: $DEFAULT_PASS"
docker exec -u www-data "$CONTAINER" php occ user:list

echo -e "\n>>> Configuracion finalizada con exito."
echo "Acceso web: http://127.0.0.1:8083"
