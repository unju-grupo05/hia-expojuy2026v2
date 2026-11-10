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
#### B. Entorno con Clúster HA de Alta Disponibilidad (3 Nodos + HAProxy + Sentinel)
Levanta la arquitectura de resiliencia con replicación física y failover automático:
```bash
docker compose -f compose.yaml -f compose.cluster-ha.yaml up -d
```

#### C. Entorno de Soporte y Gestión (MantisBT + Nextcloud)
Levanta las herramientas de soporte junto con su base de datos aislada MariaDB:
```bash
docker compose -f compose.yaml -f compose.tools.yaml up -d
```
*(Las bases de datos y usuarios de Mantis y Nextcloud se crean automáticamente al iniciar gracias a `init-tools-db.sql`).*

---
##  Tabla de Servicios y Accesos Locales
| Servicio | URL Local | Descripción | Credenciales por Defecto |
|---|---|---|---|
| **Frontend Web** | http://localhost:8080 | Portal público ExpoJuy 2026 | Libre |
| **Backend API** | http://localhost:8080/api/health | Chequeo de salud del backend | — |
| **Panel Admin Web** | http://localhost:8080/admin/login | Administración de stands y agenda | Ver `ADMIN_INITIAL_*` en `.env` |
| **pgAdmin 4** | http://localhost:5050 | Interfaz web PostgreSQL | Ver `PGADMIN_*` en `.env` |
| **PostgreSQL Host** | `localhost:5433` | Puerto directo para herramientas externas (DBeaver, psql) | Usuario en `POSTGRES_USER` |
| **HAProxy Dashboard** | http://localhost:8404/stats | Métricas en tiempo real del Clúster HA | `admin` / `expojuy_ha_secret_2026` |
| **Sentinel Status** | http://localhost:8008/cluster/status | API JSON del estado de réplicas y líder | — |
| **Mantis Bug Tracker** | http://localhost:8082 | Gestión y seguimiento de incidencias | Asistente inicial / `mantis_user` |
| **Nextcloud** | http://localhost:8083 | Repositorio documental y evidencias | Ver `NEXTCLOUD_ADMIN_*` en `.env` |
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
* 📈 **Consultas SQL de Benchmark y Resultados:** [docs/sql/](docs/sql/)
* 📋 **Plan General y Consigna del Trabajo Práctico:** [docs/PLAN_TRABAJO_INTEGRADOR_EXPOJUY_2026.md](docs/PLAN_TRABAJO_INTEGRADOR_EXPOJUY_2026.md)

## Cómo contribuir

1. Crear una rama desde `develop`: `feature/...`, `fix/...` o `docs/...`.
2. Commits con formato `tipo(ámbito): descripción`, por ejemplo `feat(infra): agregar grafana`.
3. Abrir un Pull Request contra `develop` con un compañero como revisor.
4. Nunca subir `.env`, contraseñas, tokens ni dumps de la base.

Contexto completo, decisiones y reglas para agregar servicios: [`docs/CONTEXTO_PROYECTO.md`](docs/CONTEXTO_PROYECTO.md).
