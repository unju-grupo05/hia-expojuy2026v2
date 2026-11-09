#!/usr/bin/env bash
# =============================================================================
# ExpoJuy 2026 - Respaldo Manual de Base de Datos
# Integrante 2 (DBA)
# =============================================================================

set -e

BACKUP_CONTAINER="expojuy-backup-1"

echo ">>> Iniciando respaldo manual inmediato con el contenedor de backup..."

# 1. Asegurar que el contenedor de backup esté corriendo
docker compose -f infra/compose.yaml up -d backup

# 2. Ejecutar el script oficial de respaldo del contenedor prodrigestivill/postgres-backup-local:17
docker exec -t "$BACKUP_CONTAINER" /backup.sh

echo ">>> Respaldo finalizado. Listando archivos generados en ./infra/backups/:"
ls -lh infra/backups/ | tail -n 5
