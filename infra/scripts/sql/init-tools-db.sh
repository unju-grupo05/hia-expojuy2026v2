#!/bin/bash
# =============================================================================
# ExpoJuy 2026 - Inicialización de la base de las herramientas (MariaDB)
# Crea las bases y usuarios de MantisBT y Nextcloud con las claves de infra/.env.
# MariaDB lo ejecuta solo la primera vez, cuando el volumen tools_db_data está vacío.
# Reemplaza a init-tools-db.sql, que tenía las claves escritas en el código.
# =============================================================================
set -euo pipefail

: "${MYSQL_ROOT_PASSWORD:?Falta TOOLS_DB_ROOT_PASSWORD en infra/.env}"
: "${MANTIS_DB_PASSWORD:?Falta MANTIS_DB_PASSWORD en infra/.env}"
: "${NEXTCLOUD_DB_PASSWORD:?Falta NEXTCLOUD_DB_PASSWORD en infra/.env}"

# Escapa \ y ' para usar la clave dentro de un literal SQL entre comillas simples.
sql_escape() {
  local value="${1//\\/\\\\}"
  printf '%s' "${value//\'/\'\'}"
}

MANTIS_PW="$(sql_escape "$MANTIS_DB_PASSWORD")"
NEXTCLOUD_PW="$(sql_escape "$NEXTCLOUD_DB_PASSWORD")"

mariadb --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS bugtracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mantis_user'@'%' IDENTIFIED BY '${MANTIS_PW}';
GRANT ALL PRIVILEGES ON bugtracker.* TO 'mantis_user'@'%';

CREATE DATABASE IF NOT EXISTS nextcloud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'nc_user'@'%' IDENTIFIED BY '${NEXTCLOUD_PW}';
GRANT ALL PRIVILEGES ON nextcloud_db.* TO 'nc_user'@'%';

FLUSH PRIVILEGES;
SQL

echo ">>> [TOOLS-DB] Bases y usuarios de Mantis y Nextcloud creados con las claves de .env"
