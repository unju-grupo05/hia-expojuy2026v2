# Capítulo 4 — Manual de instalación

> **Estado:** borrador. Guía para levantar el proyecto en **Windows 11** desde un **clon limpio**.
> Lo marcado con ✅ se ejecutó y verificó el 13/11/2026. Las credenciales nunca se escriben
> en este documento: siempre **ver `infra/.env`**.

## 1. Requisitos

- **Docker Desktop** con Docker Compose v2, configurado para iniciar con la sesión de Windows.
- **Git para Windows** (incluye **Git Bash**, necesario para los scripts `.sh`).
- `core.autocrlf=input` **antes de clonar**: los `.sh` tienen que conservar finales de línea LF;
  con CRLF fallan dentro de los contenedores Linux.

PowerShell:
```powershell
git config --global core.autocrlf input
```

## 2. Clonar y crear `infra/.env`

PowerShell:
```powershell
git clone https://github.com/unju-grupo05/hia-expojuy2026v2.git
cd hia-expojuy2026v2
Copy-Item infra\.env.example infra\.env
```

Editar `infra/.env` y completar las contraseñas propias. `JWT_SECRET` debe tener **32 caracteres
o más**. Las contraseñas de PostgreSQL y pgAdmin (y el administrador inicial de la app) **solo se
aplican cuando se crea el volumen**: si se cambian después, hay que recrearlo con
`docker compose down -v` (**borra la base, pgAdmin y los archivos subidos**).

Verificar la longitud de `JWT_SECRET` sin mostrar su valor (PowerShell):
```powershell
((Get-Content infra\.env | Where-Object { $_ -match '^JWT_SECRET=' }) -replace '^JWT_SECRET=','').Length
```

## 3. Levantar el modo base ✅

Servicios: `postgres`, `pgadmin`, `backup`, `backend` y `frontend`.

PowerShell:
```powershell
cd infra
docker compose up -d --build
```

Verificar (PowerShell, desde `infra/`):
```powershell
docker compose ps
```
Resultado esperado: `postgres`, `backend` y `frontend` en `healthy`; `pgadmin` en `Up`;
`backup` pasa de `health: starting` a `healthy` a los pocos minutos.

```powershell
curl.exe -i http://localhost:8080/api/health
```
Resultado esperado: `HTTP/1.1 200 OK` y `{"status":"ok","db":"ok"}`
(navegador → Nginx → backend → PostgreSQL).

Web: http://localhost:8080

## 4. Preparar el primario para replicación ✅

Paso necesario **antes** del clúster HA: crea el rol `replicator` y la regla de replicación en
`pg_hba.conf` del primario. Sin esto, las réplicas no pueden clonar la base.

PowerShell, desde `infra/`, con el modo base levantado:
```powershell
& 'C:\Program Files\Git\bin\bash.exe' -c 'export MSYS_NO_PATHCONV=1; set -a; source .env; set +a; bash scripts/setup-replication-primary.sh'
```
- Se usa la ruta completa de Git Bash: `bash` a secas en PowerShell abre WSL.
- `MSYS_NO_PATHCONV=1` evita que Git Bash convierta rutas como `/var/lib/...` a rutas de Windows.
- `set -a; source .env; set +a` exporta las variables de `infra/.env` para que el script use
  esas credenciales.

Resultado esperado: `NOTICE: Usuario replicator creado con rol REPLICATION.`,
`NOTICE: Replication slot "expojuy_replica_slot" creado exitosamente.`, `pg_reload_conf` = `t`
y el slot listado con `active = f` (lo usa el flujo histórico de una réplica, no el clúster HA).

Verificar (PowerShell):
```powershell
@'
SELECT rolname, rolreplication FROM pg_roles WHERE rolname = 'replicator';
'@ | docker exec -i expojuy-postgres-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```
Resultado esperado: una fila `replicator | t`.

## 5. Módulos adicionales

### 5.1 Clúster HA (3 nodos + HAProxy + Sentinel)
> **TODO (Ignacio):** pendiente de verificar en clon limpio.

### 5.2 Dataset de 6.000.000 de registros
> **TODO (Ignacio):** pendiente de verificar en clon limpio.

### 5.3 Monitoreo (Prometheus + Grafana)
> **TODO (Ignacio):** pendiente de verificar en clon limpio.

### 5.4 Herramientas (MantisBT + Nextcloud)
> **TODO (Ignacio):** pendiente de verificar en clon limpio.

## 6. Problemas conocidos

| Problema | Solución |
|---|---|
| El paso de replicación (sección 4) no figura en el README. | Ejecutarlo antes de levantar `compose.cluster-ha.yaml`. |
| `bash` en PowerShell abre WSL, no Git Bash. ✅ | Usar `C:\Program Files\Git\bin\bash.exe` con `MSYS_NO_PATHCONV=1`. |
| `db-failover-manager` monta `infra/failover-manager` y necesita `node_modules`, que no está en el repo; su `Dockerfile` no se usa. | Pendiente de corrección en `compose.cluster-ha.yaml` (`build: ./failover-manager`). |
| La contraseña de Nextcloud está fija en `infra/scripts/sql/init-tools-db.sql`. | `NEXTCLOUD_DB_PASSWORD` de `infra/.env` tiene que coincidir con ese archivo. |
| `infra/scripts/test-cluster-ha.ps1` y `.sh` usan una contraseña fija. | Fallan si `POSTGRES_PASSWORD` de `infra/.env` es otra. |
