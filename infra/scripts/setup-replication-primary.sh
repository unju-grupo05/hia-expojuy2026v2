#!/usr/bin/env bash
# =============================================================================
# ExpoJuy 2026 - Configuración de Replicación Streaming en el Primario
# Integrante 2 (DBA)
# =============================================================================

set -e

PRIMARY_CONTAINER="expojuy-postgres-1"
REPL_USER="${POSTGRES_REPLICATION_USER:-replicator}"
REPL_PASS="${POSTGRES_REPLICATION_PASSWORD:-G7Fw6Q2JDATv9N8sk0fmMxgia4XjRBIE}"
SLOT_NAME="expojuy_replica_slot"
APP_USER="${POSTGRES_USER:-expojuy_app}"
APP_DB="${POSTGRES_DB:-expojuy}"

echo ">>> [PRIMARY] Configurando nodo primario para Replicación Streaming..."

# 1. Crear usuario replicador con permisos REPLICATION si no existe
docker exec -i "$PRIMARY_CONTAINER" psql -U "$APP_USER" -d "$APP_DB" <<EOSQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${REPL_USER}') THEN
        CREATE ROLE ${REPL_USER} WITH REPLICATION LOGIN ENCRYPTED PASSWORD '${REPL_PASS}';
        RAISE NOTICE 'Usuario ${REPL_USER} creado con rol REPLICATION.';
    ELSE
        ALTER ROLE ${REPL_USER} WITH REPLICATION LOGIN ENCRYPTED PASSWORD '${REPL_PASS}';
        RAISE NOTICE 'Usuario ${REPL_USER} actualizado.';
    END IF;
END \$\$;
EOSQL

# 2. Crear slot físico de replicación si no existe
docker exec -i "$PRIMARY_CONTAINER" psql -U "$APP_USER" -d "$APP_DB" <<EOSQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_replication_slots WHERE slot_name = '${SLOT_NAME}') THEN
        PERFORM pg_create_physical_replication_slot('${SLOT_NAME}');
        RAISE NOTICE 'Replication slot "${SLOT_NAME}" creado exitosamente.';
    ELSE
        RAISE NOTICE 'Replication slot "${SLOT_NAME}" ya existe.';
    END IF;
END \$\$;
EOSQL

# 3. Configurar pg_hba.conf para permitir conexiones de replicación desde la red Docker
docker exec -i "$PRIMARY_CONTAINER" bash -c "
if ! grep -q 'host replication ${REPL_USER}' /var/lib/postgresql/data/pg_hba.conf; then
    echo 'host replication ${REPL_USER} all scram-sha-256' >> /var/lib/postgresql/data/pg_hba.conf
    echo 'host replication ${REPL_USER} all md5' >> /var/lib/postgresql/data/pg_hba.conf
    echo 'host replication ${REPL_USER} all trust' >> /var/lib/postgresql/data/pg_hba.conf
fi
"

# 4. Recargar configuración de PostgreSQL
docker exec -i "$PRIMARY_CONTAINER" psql -U "$APP_USER" -d "$APP_DB" -c "SELECT pg_reload_conf();"

echo ">>> [PRIMARY] Configuración completada y verificada."
docker exec -i "$PRIMARY_CONTAINER" psql -U "$APP_USER" -d "$APP_DB" -c "SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots;"
