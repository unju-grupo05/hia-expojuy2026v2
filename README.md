# ExpoJuy 2026

Web de la ExpoJuy 2026 y su infraestructura completa, desarrollada como Práctica Integradora Final.

| Carpeta | Contenido |
|---|---|
| `frontend/` | App Angular 21 |
| `backend/` | API Node.js + Express |
| `infra/` | Docker Compose del entorno |
| `docs/` | Plan de trabajo, consigna y contexto del proyecto |

## Levantar el entorno

Requisitos previos: [Docker Desktop](https://www.docker.com/products/docker-desktop/) y Git.
### 1. Preparar el entorno
```bash
git clone https://github.com/Ignacio367/hia-expojuy2026v2.git
cd hia-expojuy2026v2/infra
cp .env.example .env    # Configurar contraseñas locales (mínimo JWT_SECRET de 32 chars)
```
### 2. Modos de ejecución con Docker Compose
Puedes levantar el entorno según el área que necesites evaluar:
#### A. Entorno Núcleo de Aplicación (Desarrollo Web y API)
Levanta Angular 21, API Node.js, PostgreSQL 17 base y pgAdmin:
```bash
docker compose up -d --build
```
Verificación (en Linux/macOS, `curl` en lugar de `curl.exe`; en PowerShell `curl` a secas es un alias de `Invoke-WebRequest`):
```powershell
docker compose ps                                  # postgres, backend y frontend en "healthy"
curl.exe -i http://localhost:8080/api/health       # 200 {"status":"ok","db":"ok"}
```
#### B. Entorno con Clúster HA de Alta Disponibilidad (3 Nodos + HAProxy + Sentinel)
Levanta la arquitectura de resiliencia con replicación física y failover automático.

Requisito previo (con el modo A ya levantado): crear el rol `replicator` en el primario. Se hace una vez por base nueva: la primera vez y después de cada `down -v`.

Windows (PowerShell): usar el bash de Git, no el de WSL (`bash` a secas abre WSL); `MSYS_NO_PATHCONV=1` evita que Git Bash convierta las rutas `/var/...`:
```powershell
& 'C:\Program Files\Git\bin\bash.exe' -c 'export MSYS_NO_PATHCONV=1; set -a; source .env; set +a; bash scripts/setup-replication-primary.sh'
```
Linux / macOS / Git Bash:
```bash
set -a; source .env; set +a
bash scripts/setup-replication-primary.sh
```
Verificación: la salida muestra `Usuario replicator creado con rol REPLICATION`, `pg_reload_conf` = `t` y la tabla del slot `expojuy_replica_slot`.

```bash
docker compose -f compose.yaml -f compose.cluster-ha.yaml up -d
```
La primera vez se construye la imagen del Sentinel (`expojuy-failover-manager`); con `--build` se reconstruye si cambia su código.

Verificación (en Linux/macOS, `curl` en lugar de `curl.exe`):
```powershell
docker compose -f compose.yaml -f compose.cluster-ha.yaml ps   # réplicas y Sentinel "healthy", db-loadbalancer "Up"
curl.exe -i http://localhost:8080/api/health                   # 200: el backend llega a la base a través de HAProxy
curl.exe http://127.0.0.1:8008/cluster/status                  # JSON con el líder actual y el estado de las réplicas
```
Panel de HAProxy: http://localhost:8404/stats (escrituras solo al líder, lecturas repartidas entre los 3 nodos).

Para volver al modo A (por ejemplo, si el clúster falla): `docker compose up -d`, que recrea el backend apuntando directo a `postgres`. No usar `down -v`: borra los volúmenes con los datos.

Puertos del clúster (todos publicados solo en `127.0.0.1`; se cambian desde `infra/.env`):

| Servicio | Puerto host | Puerto interno | Variable | Uso |
|---|---|---|---|---|
| `postgres-replica-1` | `5434` | `5432` | `POSTGRES_REPLICA_1_PORT` | Réplica en streaming (solo lectura) |
| `postgres-replica-2` | `5435` | `5432` | `POSTGRES_REPLICA_2_PORT` | Réplica en streaming (solo lectura) |
| `db-failover-manager` (Sentinel) | `8008` | `8008` | `HA_SENTINEL_PORT` | API de estado: `/health`, `/cluster/status` |
| `db-loadbalancer` (HAProxy) escritura | `5437` | `5432` | `HA_PROXY_WRITE_PORT` | Dirige al nodo primario activo |
| `db-loadbalancer` (HAProxy) lectura | `5438` | `5436` | `HA_PROXY_READ_PORT` | Balancea en round-robin entre los 3 nodos |
| `db-loadbalancer` (HAProxy) stats | `8404` | `8404` | `HA_PROXY_STATS_PORT` | Panel web en `/stats` |

Puertos internos (no publicados, solo en la red `data`):
- `8001`, `8002`, `8003`: agent-check del Sentinel; HAProxy los consulta para saber qué nodo es el líder.
- `db-loadbalancer:5432`: en este modo el backend se conecta a la base a través de HAProxy.

#### C. Entorno de Soporte y Gestión (MantisBT + Nextcloud)
Levanta las herramientas de soporte junto con su base de datos aislada MariaDB.

Con el clúster HA (modo B) levantado, incluir también su archivo; si se omite, el backend se recrea sin HAProxy y el clúster queda huérfano:
```bash
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml up -d
```
Solo con el modo A:
```bash
docker compose -f compose.yaml -f compose.tools.yaml up -d
```
*(Las bases de datos y usuarios de Mantis y Nextcloud se crean automáticamente al iniciar por `infra/scripts/sql/init-tools-db.sh`, con las claves `MANTIS_DB_PASSWORD` y `NEXTCLOUD_DB_PASSWORD` de `.env`. Solo corre con el volumen `tools_db_data` vacío: si se cambian esas claves, hay que borrar ese volumen).*

#### D. Monitoreo (Prometheus + Grafana + exporters)
Levanta Prometheus, Grafana, node-exporter, cAdvisor y un postgres-exporter por nodo (primario y dos réplicas; los de las réplicas necesitan el modo B). Incluir los archivos de los modos que ya estén levantados (ejemplo con A + B + C):
```bash
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml up -d
```
Solo con el modo A:
```bash
docker compose -f compose.yaml -f compose.monitoring.yaml up -d
```
Accesos:
- Prometheus: http://localhost:9090 (estado de los targets en http://localhost:9090/targets, alertas en http://localhost:9090/alerts).
- Grafana: http://localhost:3001 (usuario y clave en `GF_SECURITY_ADMIN_*` de `.env`). El datasource Prometheus ya viene provisionado.

Los exporters no publican puertos: Prometheus los consulta por la red interna. Grafana arranca sin dashboards; para importar uno: *Dashboards → New → Import* con un ID de grafana.com (por ejemplo `1860` Node Exporter Full, `9628` PostgreSQL). Los dashboards importados quedan en el volumen de Grafana, no en el repo.

#### Combinar modos y apagar
Compose no recuerda qué archivos se usaron: cada comando (`up`, `ps`, `logs`, `down`) aplica solo los `-f` que recibe. Usar siempre los mismos archivos que en el `up`.

```bash
# Apagar todo conservando los datos
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml down
# Empezar de cero: -v BORRA todos los volúmenes (base, réplicas, herramientas)
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml down -v
```
Después de un `down -v` hay que volver a crear el rol `replicator` (requisito del modo B).

#### Chequeo rápido de servicios
Script de solo lectura que dice qué modos (A, B, C, D) están levantados, qué servicios faltan o fallan y si hay errores críticos:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-servicios.ps1
```
| Resultado | Significado | Código de salida |
|---|---|---|
| `todo OK` | Los modos levantados están completos y responden | `0` |
| `OK con avisos` | Funciona, pero hay algo a revisar (servicio arrancando, frontend en `0.0.0.0`, backend fuera del clúster) | `1` |
| `ERRORES CRITICOS` | Un servicio caído, `unhealthy` o en reinicio, la API sin responder o un puerto fuera de `127.0.0.1` | `2` |

---
##  Tabla de Servicios y Accesos Locales
| Servicio | URL Local | Descripción | Credenciales por Defecto |
|---|---|---|---|
| **Frontend Web** | http://localhost:8080 | Portal público ExpoJuy 2026 | Libre |
| **Backend API** | http://localhost:8080/api/health | Chequeo de salud del backend | — |
| **Panel Admin Web** | http://localhost:8080/admin/login | Administración de stands y agenda | Ver `ADMIN_INITIAL_*` en `.env` |
| **pgAdmin 4** | http://localhost:5050 | Interfaz web PostgreSQL | Ver `PGADMIN_*` en `.env` |
| **PostgreSQL Host** | `localhost:5433` | Puerto directo para herramientas externas (DBeaver, psql) | Usuario en `POSTGRES_USER` |
| **HAProxy Dashboard** | http://localhost:8404/stats | Métricas en tiempo real del Clúster HA | Ver `HA_PROXY_STATS_*` en `.env` |
| **Sentinel Status** | http://localhost:8008/cluster/status | API JSON del estado de réplicas y líder | — |
| **Mantis Bug Tracker** | http://localhost:8082 | Gestión y seguimiento de incidencias | Asistente inicial / `mantis_user` |
| **Nextcloud** | http://localhost:8083 | Repositorio documental y evidencias | Ver `NEXTCLOUD_ADMIN_*` en `.env` |
| **Prometheus** | http://localhost:9090 | Métricas, targets y alertas | — |
| **Grafana** | http://localhost:3001 | Dashboards de monitoreo | Ver `GF_SECURITY_ADMIN_*` en `.env` |
---

## 📊 Dataset Masivo, Benchmark y Pruebas DBA (Puntos 4, 5 y 6)

Para reproducir las pruebas del Senior DBA sobre el dataset de **6.000.000 de registros**, optimizaciones de consultas con `EXPLAIN ANALYZE` y simulación de caídas del clúster:

> 📖 **Guía Completa de Datos y Benchmarks:** Consulta el documento técnico consolidado en **[docs/IMPLEMENTACION_ACTUAL.md](docs/IMPLEMENTACION_ACTUAL.md)** para el detalle paso a paso:
> - [Carga masiva de 6M de visitas en telemetría](docs/IMPLEMENTACION_ACTUAL.md#2-telemetría-y-carga-masiva-capítulo-6)
> - [Ejecución del benchmark automatizado de 8 consultas SQL](docs/IMPLEMENTACION_ACTUAL.md#3-medición-y-optimización-sql-capítulo-7)
> - [Verificación y pruebas de failover automático del Clúster HA](docs/IMPLEMENTACION_ACTUAL.md#4-replicación-física-y-alta-disponibilidad-capítulo-8)
> - [Pruebas de restauración y verificación de backups](docs/IMPLEMENTACION_ACTUAL.md#5-backup-restauración-y-verificación-capítulo-15)

---

## 📚 Mapa de Documentación del Proyecto

* 🏛️ **Arquitectura, Roles y Reglas de Desarrollo:** [docs/CONTEXTO_PROYECTO.md](docs/CONTEXTO_PROYECTO.md)
* 🗄️ **Base de Datos, Optimización y Clúster:** [docs/IMPLEMENTACION_ACTUAL.md](docs/IMPLEMENTACION_ACTUAL.md)
* 🔧 **Cambios en la infraestructura (alertas, targets, variables, servicios, después de un pull):** [docs/OPERACION_CAMBIOS.md](docs/OPERACION_CAMBIOS.md)
* 📈 **Consultas SQL de Benchmark y Resultados:** [docs/sql/](docs/sql/)
* 📋 **Plan General y Consigna del Trabajo Práctico:** [docs/PLAN_TRABAJO_INTEGRADOR_EXPOJUY_2026.md](docs/PLAN_TRABAJO_INTEGRADOR_EXPOJUY_2026.md)

## Cómo contribuir

1. Crear una rama desde `develop`: `feature/...`, `fix/...` o `docs/...`.
2. Commits con formato `tipo(ámbito): descripción`, por ejemplo `feat(infra): agregar grafana`.
3. Abrir un Pull Request contra `develop` con un compañero como revisor.
4. Nunca subir `.env`, contraseñas, tokens ni dumps de la base.

Contexto completo, decisiones y reglas para agregar servicios: [`docs/CONTEXTO_PROYECTO.md`](docs/CONTEXTO_PROYECTO.md).

---

## Reiniciar todo desde cero

⚠️ Borra **todos** los datos: base, réplicas, pgAdmin, Mantis, Nextcloud, Prometheus y Grafana. Comandos para PowerShell, desde `infra/`.

**1. Bajar todo.** Un `docker compose down -v` sin los `-f` solo borra el modo A; el resto queda vivo con sus volúmenes.
```powershell
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml down -v --rmi local
```
`--rmi local` borra también las imágenes construidas localmente (backend, frontend, Sentinel); es opcional.

**2. Comprobar que no quedó nada** (los tres sin filas):
```powershell
docker ps -a --filter name=expojuy
docker volume ls --filter name=expojuy
docker network ls --filter name=expojuy
```

**3. Levantar de nuevo, en este orden:**
```powershell
# A. Base
docker compose up -d --build
curl.exe -i http://localhost:8080/api/health

# Requisito de B: la base es nueva, hay que volver a crear el rol replicator
& 'C:\Program Files\Git\bin\bash.exe' -c 'export MSYS_NO_PATHCONV=1; set -a; source .env; set +a; bash scripts/setup-replication-primary.sh'

# B. Clúster HA (si las réplicas dan "unhealthy" la primera vez, repetir este comando)
docker compose -f compose.yaml -f compose.cluster-ha.yaml up -d

# C. Herramientas (después hay que completar el instalador de Mantis)
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml up -d

# D. Monitoreo (opcional)
docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml up -d
```

**4. Chequear:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-servicios.ps1
```

No se tocan: `infra/.env`, los backups de `infra/backups/` (carpeta del host), las imágenes descargadas ni la configuración de Tailscale Funnel.
