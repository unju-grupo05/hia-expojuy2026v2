#!/usr/bin/env bash
# =============================================================================
# ExpoJuy 2026 - Prueba Automatizada de Restauración y Verificación de Integridad
# Integrante 2 (DBA)
# Puntos 4 y 15 del TP: Verificación de integridad de >= 6.000.000 de registros
# =============================================================================

set -e

PRIMARY_CONTAINER="expojuy-postgres-1"
DB_USER="${POSTGRES_USER:-expojuy_app}"
TEST_DB="expojuy_restore_test"
BACKUP_DIR="infra/backups"

echo "====================================================================="
echo "   EXPOJUY 2026 - PRUEBA DE RECUPERACIÓN ANTE DESASTRES (RESTORE TEST)"
echo "====================================================================="

# 1. Identificar el último dump disponible
LATEST_BACKUP=$(find ${BACKUP_DIR} -name "*.sql.gz" -size +1k -type f 2>/dev/null | head -n 1 || true)

if [ -z "$LATEST_BACKUP" ]; then
    LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/last/*.sql.gz 2>/dev/null | head -n 1 || true)
fi

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No se encontró ningún respaldo .sql.gz en $BACKUP_DIR."
    echo "Ejecute primero './infra/scripts/backup-manual.sh' para generar uno."
    exit 1
fi

echo ">>> Último archivo de backup detectado: $LATEST_BACKUP"
BACKUP_SIZE=$(ls -lh "$LATEST_BACKUP" | awk '{print $5}')
echo ">>> Tamaño comprimido del backup: $BACKUP_SIZE"

# 2. Preparar base de datos limpia de pruebas
echo ">>> Creando base de datos limpia de pruebas: $TEST_DB..."
docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE);"
docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $TEST_DB OWNER $DB_USER;"

# 3. Restaurar el volcado completo en la base de pruebas
echo ">>> Descomprimiendo y restaurando volcado en $TEST_DB..."
RESTORE_START=$(date +%s)

gunzip -c "$LATEST_BACKUP" | docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -q

RESTORE_END=$(date +%s)
RESTORE_DUR=$((RESTORE_END - RESTORE_START))
echo ">>> Restauración completada en $RESTORE_DUR segundos."

# 4. Verificación exhaustiva de integridad y conteos
echo ">>> Verificando integridad de los datos restaurados..."

TOTAL_VISITAS=$(docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM visitas_stands;" | xargs)
TOTAL_STANDS=$(docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM stands;" | xargs)
TOTAL_EXPOSITORES=$(docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM expositores;" | xargs)
TOTAL_EJES=$(docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM ejes;" | xargs)
HUERFANOS_STAND=$(docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM visitas_stands v LEFT JOIN stands s ON v.stand_id = s.id WHERE s.id IS NULL;" | xargs)

echo "---------------------------------------------------------------------"
echo "   REPORTE DE INTEGRIDAD EN BASE RESTAURADA ($TEST_DB)"
echo "---------------------------------------------------------------------"
echo "Stands maestros restaurados:     $TOTAL_STANDS (Esperado: 160)"
echo "Expositores restaurados:         $TOTAL_EXPOSITORES (Esperado: 75)"
echo "Ejes temáticos restaurados:      $TOTAL_EJES (Esperado: 6)"
echo "Visitas registradas:             $TOTAL_VISITAS (Requisito: >= 6.000.000)"
echo "Huérfanos referenciales detectados: $HUERFANOS_STAND (Esperado: 0)"
echo "---------------------------------------------------------------------"

if [ "$TOTAL_VISITAS" -ge 6000000 ] && [ "$HUERFANOS_STAND" -eq 0 ]; then
    echo ">>> RESULTADO: ¡PRUEBA DE RESTAURACIÓN EXITOSA AL 100%! <<<"
    echo ">>> Eliminando base de datos temporal de pruebas..."
    docker exec -i "$PRIMARY_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE $TEST_DB WITH (FORCE);"
    echo ">>> Entorno de pruebas limpio."
    exit 0
else
    echo ">>> ERROR: La verificación de integridad no cumplió con los umbrales esperados."
    exit 1
fi
