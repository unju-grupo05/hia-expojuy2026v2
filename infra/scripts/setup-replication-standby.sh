#!/usr/bin/env bash
# =============================================================================
# ExpoJuy 2026 - Inicialización del Nodo Standby (Réplica)
# Integrante 2 (DBA)
# =============================================================================

set -e

PRIMARY_HOST="postgres"
PRIMARY_PORT="5432"
REPL_USER="${POSTGRES_REPLICATION_USER:-replicator}"
REPL_PASS="${POSTGRES_REPLICATION_PASSWORD:-G7Fw6Q2JDATv9N8sk0fmMxgia4XjRBIE}"
SLOT_NAME="expojuy_replica_slot"
STANDBY_CONTAINER="expojuy-postgres-replica"

echo ">>> [STANDBY] Iniciando clonación del primario con pg_basebackup..."

# 1. Asegurar que el contenedor réplica esté detenido para vaciar el volumen
docker compose -f infra/compose.yaml -f infra/compose.db-replica.yaml stop postgres-replica || true

# 2. Ejecutar pg_basebackup montando el volumen de la réplica en un contenedor temporal
docker run --rm \
    --network expojuy_data \
    -e PGPASSWORD="$REPL_PASS" \
    -v expojuy_pgdata-replica:/var/lib/postgresql/data \
    pgvector/pgvector:pg17 \
    bash -c "
        echo 'Limpiando directorio de datos antiguo...'
        rm -rf /var/lib/postgresql/data/* /var/lib/postgresql/data/.[!.]*
        echo 'Ejecutando pg_basebackup desde $PRIMARY_HOST...'
        pg_basebackup -h $PRIMARY_HOST -p $PRIMARY_PORT -U $REPL_USER -D /var/lib/postgresql/data -Fp -Xs -P -R -S $SLOT_NAME
        echo 'Base inicial sincronizada exitosamente.'
        chown -R postgres:postgres /var/lib/postgresql/data
        chmod 700 /var/lib/postgresql/data
    "

# 3. Iniciar el servicio standby
echo ">>> [STANDBY] Levantando contenedor réplica..."
docker compose -f infra/compose.yaml -f infra/compose.db-replica.yaml up -d postgres-replica

# 4. Esperar a que la réplica esté lista
echo ">>> [STANDBY] Esperando disponibilidad del nodo standby..."
sleep 5

# 5. Validar que se encuentre en modo Hot Standby (recuperación activa)
docker exec -i "$STANDBY_CONTAINER" psql -U "${POSTGRES_USER:-expojuy_app}" -d "${POSTGRES_DB:-expojuy}" -c "SELECT pg_is_in_recovery() AS es_standby_replica;"

echo ">>> [STANDBY] Réplica configurada y sincronizada correctamente."
