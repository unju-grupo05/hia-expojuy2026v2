# Contexto del proyecto ExpoJuy 2026 — Práctica Integradora Final

Documento de contexto para el equipo y para asistentes de IA. Describe el **estado real** del
repositorio y las decisiones tomadas. Si algo de `PLAN_TRABAJO_INTEGRADOR_EXPOJUY_2026.md`
contradice este documento, **vale este documento** (el plan es anterior a varias decisiones).

La consigna oficial está en `docs/trabajo_integrador_2026.docx.pdf`. Al final hay un resumen.

---

## 1. Qué es el proyecto

ExpoJuy 2026 es la web de una exposición en Jujuy: inicio, expositores, stands con mapa 3D,
agenda, noticias, galería, reuniones B2B, panel de administración y un chatbot.

El trabajo práctico consiste en tomar esta aplicación y aplicarle todo el ciclo DevOps:
contenedores, base de datos optimizada y replicada, CI/CD, publicación en Internet, monitoreo,
gestión de incidencias, documentación, automatización con n8n y ciberseguridad.

- **Entrega y defensa oral:** semana del 16 de noviembre de 2026 (20 minutos, 5 integrantes).
- **Nota individual:** cada integrante debe poder explicar y demostrar lo que implementó.
  La cátedra puede tomar un examen individual.

## 2. Estructura del repositorio (monorepo)

```
hia-expojuy2026v2/
├── frontend/        App Angular 21 (standalone components, Tailwind 4, Three.js, GSAP)
│   ├── Dockerfile   Build multi-stage: Node 22.23.4 → nginx-unprivileged 1.30.6 (puerto 8080)
│   └── docker/nginx/default.conf.template
├── backend/         API Node.js + Express 5 + Sequelize 6
│   └── Dockerfile   Node 22.23.4 Alpine, usuario sin root (puerto 3000)
├── infra/           Docker Compose del entorno completo
│   ├── compose.yaml
│   └── .env.example Plantilla de variables (el .env real no se versiona)
├── docs/            Plan, consigna y este documento
└── .github/         (futuro) workflows de GitHub Actions
```

## 3. Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21, TypeScript 5.9, Tailwind CSS 4, Three.js, GSAP, Vitest |
| Backend | Node.js 22, Express 5, Sequelize 6, JWT, bcrypt, multer + sharp, nodemailer, node-cron, Swagger, Jest |
| Base de datos | PostgreSQL 17 con extensión pgvector disponible |
| Contenedores | Docker + Docker Compose |
| Servidor web | Nginx (dentro de la imagen del frontend) |

Versiones de Node y Nginx fijadas a releases con parches de seguridad (Node 22.23.4 es el release
de seguridad del 20/10/2026). Modelos del backend: `Stand`, `UbicacionStand`, `Expositor`, `Noticia`, `Galeria`,
`Agenda`, `Eje`, `Correo`, `Usuario`, `Media`, `ReunionB2B`, `AuditoriaAccion`, `HistorialAcceso`,
`VisitaStand` (telemetría 6M), `AsistenciaAgenda`, `ResenaStand`, `LogChatbot` (pgvector).

## 4. Infraestructura actual (`infra/compose.yaml`)

Proyecto Compose llamado `expojuy`. Se levanta desde `infra/` con `docker compose up -d`.

| Servicio | Imagen | Acceso desde el host | Redes | Volumen |
|---|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg17` | `127.0.0.1:5433` | `data` | `pgdata` |
| `pgadmin` | `dpage/pgadmin4:9` | `127.0.0.1:5050` | `data` | `pgadmin-data` |
| `backup` | `prodrigestivill/postgres-backup-local:17` | — | `data` | `./backups` (fuera de Git) |
| `backend` | build de `../backend` | — (solo vía Nginx en `/api`) | `app`, `data` | `uploads` |
| `frontend` | build de `../frontend` | `0.0.0.0:8080` | `app` | — |

**Redes:**
- `app`: tráfico web (frontend y backend).
- `data`: base de datos y sus herramientas. Solo se conecta quien necesita la base.
  El frontend **no** está en `data` y no puede llegar a Postgres (verificado).

**Detalles importantes:**
- Postgres usa el puerto **5433** en el host para no chocar con un Postgres instalado localmente.
  Dentro de Docker el puerto es el normal: **host `postgres`, puerto `5432`**.
- Postgres y pgAdmin solo escuchan en `127.0.0.1`: no son accesibles desde la red.
- Usuario, contraseña y nombre de la base se leen del `.env` **solo la primera vez** (volumen vacío).
  Cambiarlos después en el `.env` no tiene efecto; hay que hacerlo con SQL o borrar el volumen
  (`docker compose down -v`, **borra todos los datos**).
- Las tablas las crea el backend al arrancar (`sequelize.sync`, sin borrar datos) y el seeder carga
  datos iniciales **solo si las tablas están vacías** (160 stands, noticias, agenda, ejes y el
  administrador definido en `ADMIN_INITIAL_*`). Para reiniciar la base a propósito:
  `DB_SYNC_FORCE=true` (**borra todo**).
- El administrador inicial se crea una sola vez: cambiar `ADMIN_INITIAL_PASSWORD` después no
  modifica un usuario existente.
- Salud del backend: `GET /api/health` → 200 con base disponible, 503 sin conexión.
- pgvector está disponible pero no activado: hace falta `CREATE EXTENSION vector;` en la base.
- Backups: `pg_dump` con la frecuencia de `BACKUP_SCHEDULE` (por defecto diario), rotación de
  7 diarios, 4 semanales y 3 mensuales. Backup manual: `docker compose exec backup /backup.sh`.
- Probado: persistencia tras `down`/`up`, backup y restauración en una base nueva, aislamiento
  de redes.

**Frontend y API:**
- Dentro de Docker el frontend se compila con `--configuration production,docker`, que usa
  `src/environments/environment.docker.ts` con `apiUrl: '/api'` (ruta relativa).
- Nginx reenvía `/api/` y `/uploads/` al backend definido en `BACKEND_URL`
  (por defecto `http://backend:3000`). Mismo origen: sin CORS.
- `environment.ts` y `environment.prod.ts` apuntan a `https://api.expojuy.com.ar/api` y no se tocaron.

## 5. Cómo levantar el entorno

Requisito: Docker Desktop.

```bash
git clone https://github.com/Ignacio367/hia-expojuy2026v2.git
cd hia-expojuy2026v2/infra
cp .env.example .env        # completar contraseñas propias (es local, cada uno las suyas)
docker compose up -d
docker compose ps           # todos deben quedar "healthy" o "Up"
```

- Web: http://localhost:8080
- pgAdmin: http://localhost:5050 → registrar servidor con host `postgres`, puerto `5432` y
  el usuario/contraseña de Postgres del `.env`.
- Postgres desde la PC (psql, DBeaver, scripts): `localhost:5433`.

Para desarrollar el frontend sin Docker: `cd frontend && npm install && npm start` (puerto 4200).

## 6. Convenciones de trabajo (el TP las evalúa)

**Ramas (Gitflow):**
- `main`: versión estable. Solo recibe merges desde `develop`.
- `develop`: integración. Solo recibe Pull Requests.
- `feature/<nombre-corto>`, `fix/<nombre-corto>`, `docs/<nombre-corto>`: se crean desde `develop`.
- Nadie pushea directo a `main` ni a `develop`.

**Commits (Conventional Commits, en español):**
`tipo(ámbito): descripción` — tipos: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`.
Ejemplos: `feat(infra): agregar servicio prometheus`, `fix(database): índice en visitas_stands`.

**Pull Requests:**
- Siempre contra `develop`, con al menos un compañero como revisor.
- Descripción con: qué cambia, cómo probar, pruebas realizadas.
- Merge con "Create a merge commit" (no squash).
- Labels: `infra`, `database`, `ci-cd`, `monitoring`, `automation`, `security`, `refactor`,
  `documentation`, `bug`.

**Secretos:**
- Nunca subir `.env`, contraseñas, tokens, claves ni dumps de la base (el `.gitignore` raíz los bloquea).
- Toda variable nueva va al `.env.example` con un valor de ejemplo, nunca el real.

## 7. Reglas para agregar servicios a `infra/`

Para que la integración final no sea un caos, todo servicio nuevo sigue estas reglas:

1. **Archivos:** el núcleo está en `compose.yaml`. Los servicios de cada área van en archivos
   aparte dentro de `infra/`:
   - `compose.cluster-ha.yaml`: Clúster HA de 3 nodos (Primary + 2 Standbys), HAProxy (balanceo lecturas round-robin y proxy escrituras) y Failover Manager Sentinel.
   - `compose.monitoring.yaml`: Prometheus, Grafana, cAdvisor, node-exporter, postgres-exporter.
   - `compose.automation.yaml`: n8n.
   - `compose.tools.yaml`: Mantis/GLPI, Nextcloud.

   Se combinan con varios `-f`, por ejemplo:
   `docker compose -f compose.yaml -f compose.monitoring.yaml up -d`.
   Al combinarse forman un solo proyecto y comparten las redes `app` y `data` (no redefinirlas).
2. **Imágenes con versión fija** (`grafana/grafana:11.x`), nunca `latest`.
3. **Puertos solo en localhost** (`"127.0.0.1:PUERTO:PUERTO"`) salvo que el servicio deba ser
   público, y eso se coordina con el Integrante 1. Ninguna interfaz administrativa va pública.
4. **Secretos por variables** (`${VARIABLE}`) y la variable documentada en `.env.example`.
5. **Volumen con nombre** para todo dato que deba persistir.
6. **`restart: unless-stopped`** y **`healthcheck`** cuando la imagen lo permita.
7. **Red `data` solo si el servicio necesita la base.** El resto va en `app` o en una red propia.
8. Antes de agregar un puerto en el host, verificar que no choque con los existentes
   (5433, 5050, 8080).

## 8. Equipo y responsabilidades

| Integrante | Área | Puntos del TP |
|---|---|---|
| 1 — Ignacio | DevOps y contenedores: Dockerfiles, compose, redes, publicación en Internet | 4 (parte Docker), 7, 9 |
| 2 — Anto (`antocruz06`) | Senior DBA: modelos telemetría, dataset de 6.000.000 de registros, optimización SQL (8 queries con EXPLAIN ANALYZE), clúster HA 3 nodos con failover automático y balanceo HAProxy, backups y contingencia | 4 (datos masivos), 5, 6, 11 (incidencias DBA), 15 (capítulos 6, 7, 8, 15) |
| 3 | CI/CD (GitHub Actions) y monitoreo (Prometheus + Grafana) | 8, 10 |
| 4 | n8n: 3 flujos (alertas → incidencia, verificación de backups, IA/RAG) | 13 |
| 5 | Scrum (Jira), Gitflow, Mantis/GLPI, Nextcloud, seguridad, documento final | 2, 3, 11, 12, 14, 15 |

## 9. Estado actual y detalle de trabajo completado

### 9.1 Trabajo General del Proyecto
- Monorepo con `frontend/`, `backend/` e `infra/`.
- Imagen Docker del frontend (86.6 MB, sin root, healthcheck en `/healthz`).
- Imagen Docker del backend (sin root, healthcheck en `/api/health`).
- Compose completo: Postgres, pgAdmin, backups, backend y frontend. Probado: persistencia,
  backup/restauración, aislamiento de redes y la web consumiendo la API a través de Nginx.
- Corregido: el backend usaba `sync({ force: true })` y **borraba todas las tablas en cada
  arranque** (incidencia de pérdida de datos para Mantis).

### 9.2 Trabajo Integral Realizado por el Integrante 2 (Senior DBA & Rendimiento)

El Integrante 2 ha implementado, probado y documentado al 100% sus áreas de responsabilidad correspondientes a los Puntos 4, 5, 6, 11 y 15 de la consigna oficial:

#### A. Modelos de Telemetría y Dataset Masivo de 6.000.000 de Registros (Punto 4)
- **Nuevos Modelos de Dominio en Sequelize:** Creación de `VisitaStand` (`visitas_stands`), `AsistenciaAgenda` (`asistencias_agenda`), `ResenaStand` (`resenas_stands`), `LogChatbot` (`logs_chatbot` con soporte de embeddings vectoriales vía `pgvector`) y extensiones en `Stand`.
- **Controladores, Rutas REST y Suite de Pruebas:**
  - `visitaStand.controller.js` y `visitaStand.route.js` (filtros, métricas de afluencia, paginación).
  - `asistenciaAgenda.controller.js` y `asistenciaAgenda.route.js` (gestión de concurrencia en conferencias).
  - `resenaStand.controller.js` y `resenaStand.route.js` (calificaciones y feedback de expositores).
  - `chatbot.controller.js` y `chatbot.route.js` (telemetría y registro de consultas).
  - Suite de tests unitarios y de integración en `backend/tests/telemetria.controller.test.js` y actualización de `backend/tests/stand.controller.test.js`.
- **Pipeline de Generación y Carga Masiva (6.000.000 de registros):**
  - Script SQL de alta velocidad con `generate_series()` en `backend/src/seeders/dataset_6m_visitas.sql` (carga completa en menos de 2 minutos).
  - Generador sintético en Node.js por lotes transaccionales (*batch insert*) con control de memoria en `backend/src/seeders/seed-masivo-visitas.js`.
  - Sincronización controlada sin borrado destructivo en `backend/src/seeders/run-initial-sync.js`.
  - **Volumen de Datos Medido:** Tabla `visitas_stands` con ~1,03 GB de datos + índices (~1,32 GB totales en disco).
  - **Documentación Técnica:** [docs/capitulo_06_migracion_carga_masiva.md](file:///D:/APU/3ro/HIA/hia-expojuy2026v2/docs/capitulo_06_migracion_carga_masiva.md).

#### B. Optimización de Consultas SQL y Benchmarking (Punto 5)
- **Habilitación de `pg_stat_statements`:** Activado en PostgreSQL 17 (`shared_preload_libraries=pg_stat_statements`, `pg_stat_statements.track=all`) para auditoría de rendimiento en tiempo real.
- **Diseño de 8 Consultas Pesadas de Negocio:** Consultas complejas de analítica sobre los 6M de filas en `docs/sql/01_consultas_negocio_benchmark.sql` (visitas por franja horaria, expositores más concurridos, tiempo promedio de permanencia, auditoría de asistencia, anomalías de tráfico).
- **Auditoría Inicial:** Mediciones con `EXPLAIN (ANALYZE, BUFFERS)` que detectaron *Sequential Scans* masivos con tiempos de ejecución de hasta 3.500 ms y costos en el planner superiores a 250.000 unidades.
- **Estrategia de Optimización e Índices (`docs/sql/02_optimizaciones_indices.sql`):**
  - Eliminación de predicados no-SARGables (reemplazo de funciones `EXTRACT()`, `DATE()` por comparaciones directas de rangos de fechas `BETWEEN` y `>= / <`).
  - Creación de índices compuestos B-Tree estratégicos para filtros y ordenamientos conjuntos.
  - Creación de índices de cobertura (*covering indexes*) con cláusula `INCLUDE` para forzar *Index Only Scans*.
  - Creación de índices parciales (*partial indexes*) para visitas VIP y registros anómalos.
- **Runner de Benchmark Automatizado (`backend/scripts/benchmark_runner.js`):** Script que ejecuta comparativas antes/después y exporta métricas en `docs/sql/benchmark_resultados.json`, demostrando reducciones de costo y tiempo de hasta **99.8%** (de segundos a submilisegundos).
- **Documentación Técnica:** [docs/capitulo_07_optimizacion_sql.md](file:///D:/APU/3ro/HIA/hia-expojuy2026v2/docs/capitulo_07_optimizacion_sql.md).

#### C. Clúster de Replicación de 3 Nodos, Balanceo de Carga y Failover Automático (Punto 6)
- **Clúster de 3 Nodos en Docker (`infra/compose.cluster-ha.yaml`):**
  - **Nodo 1 (`postgres`):** Primario inicial de lectura y escritura (`127.0.0.1:5433`).
  - **Nodo 2 (`postgres-replica-1`):** Standby 1 con *Hot Standby* (`127.0.0.1:5434`).
  - **Nodo 3 (`postgres-replica-2`):** Standby 2 con *Hot Standby* (`127.0.0.1:5435`).
  - Aprovisionamiento e inicialización idempotente desatendida mediante punto de entrada con `pg_basebackup -Fp -Xs -P -R` que clona los 6M de registros automáticamente en segundos si el volumen está vacío.
  - Parámetros en `postgresql.conf`: `wal_level=replica`, `max_wal_senders=10`, `max_replication_slots=10`, `hot_standby=on`. Usuario `replicator` con autenticación segura en `pg_hba.conf`.
- **Balanceador de Carga L4 y Proxy Transaccional (`infra/haproxy/haproxy.cfg`):**
  - **Pool de Lectura (Puerto `5438` host / `5436` interno):** Balanceo en estricto *Round-Robin* que reparte 1/3 de las consultas `SELECT` a cada uno de los 3 nodos.
  - **Pool de Escritura (Puerto `5437` host / `5432` interno):** Enrutamiento dinámico guiado por *Agent-Check* hacia el nodo que ejerce como Líder activo.
  - **Dashboard Web de Métricas (Puerto `8404`):** Panel en tiempo real en `http://127.0.0.1:8404/stats` (usuario `admin`, clave `expojuy_ha_secret_2026`).
- **Sentinel & Auto-Failover Manager (`infra/failover-manager/index.js` en Node.js 22):**
  - Monitoreo continuo sin solapamientos cada 2.000 ms sobre los 3 nodos.
  - **Prevención de Split-Brain mediante Timeline ID:** Detección de liderazgo basada en `SELECT timeline_id FROM pg_control_checkpoint()`. Si un primario viejo revivido intenta reportarse activo con Timeline 1, el Sentinel lo aísla y niega tráfico de escritura.
  - **Promoción Atómica:** Detección de caída del maestro en 3 chequeos consecutivos (6 segundos) y ejecución desatendida de `SELECT pg_promote()`.
  - **Reconfiguración en Cascada:** Actualización en caliente de la réplica sobreviviente (`ALTER SYSTEM SET primary_conninfo` + `SELECT pg_reload_conf()`) para engancharse al nuevo maestro en Timeline 2 sin reiniciar contenedores.
  - **Agent-Check TCP:** Puertos 8001, 8002 y 8003 que informan a HAProxy en tiempo real (`ready up 100%`, `maint`, `down`).
  - **REST API en vivo:** Métricas JSON del clúster en `http://127.0.0.1:8008/cluster/status`.
- **Suite de Pruebas Automatizadas:** `infra/scripts/test-cluster-ha.ps1` y `infra/scripts/test-cluster-ha.sh`.
- **Documentación Técnica Unificada:** [docs/capitulo_08_cluster_replicacion.md](file:///D:/APU/3ro/HIA/hia-expojuy2026v2/docs/capitulo_08_cluster_replicacion.md).

#### D. Estrategia de Backups y Recuperación ante Desastres (Punto 4 y 15)
- Servicio `backup` en `infra/compose.yaml` con rotación automática (7 diarios, 4 semanales, 3 mensuales).
- Script de respaldo manual bajo demanda en `infra/scripts/backup-manual.sh`.
- Scripts de prueba de restauración automatizada en contenedor aislado temporal: `infra/scripts/restore-test.sh` y `infra/scripts/restore-test.ps1`.
- **Documentación Técnica:** [docs/capitulo_15_backup_restauracion.md](file:///D:/APU/3ro/HIA/hia-expojuy2026v2/docs/capitulo_15_backup_restauracion.md).

#### E. Registro de Incidencias Reales para Mantis Bug Tracker (Punto 11)
5 incidencias de base de datos documentadas con severidad, pasos de reproducción, causa raíz y solución aplicada en [docs/incidencias_mantis_dba.md](file:///D:/APU/3ro/HIA/hia-expojuy2026v2/docs/incidencias_mantis_dba.md):
1. **DBA-01 (Bloqueante):** Pérdida masiva de datos en cada reinicio del backend debido a `sync({ force: true })`.
2. **DBA-02 (Mayor):** Cuello de botella en telemetría de visitas a stands por falta de índices.
3. **DBA-03 (Mayor):** Degradación severa de CPU por Sequential Scans en consultas con funciones no-SARGables.
4. **DBA-04 (Crítica):** Bloqueo de escrituras e indisponibilidad prolongada (RTO alto) por esquema de failover manual de 2 nodos.
5. **DBA-05 (Mayor):** Riesgo de saturación de disco y caída del nodo primario por acumulación descontrolada de archivos WAL.



**Hallazgos pendientes (incidencias para Mantis):**
- CORS acepta cualquier origen (`index.js`: ambas ramas del callback devuelven `true`). Seguridad.
- Dependencias sin uso: `googleapis` y `xlsx` (esta última con vulnerabilidades conocidas).
  Inflan la imagen del backend (716 MB). Seguridad y rendimiento.
- `/api-docs` (Swagger) queda público. Evaluar restringirlo al publicar en Internet.

**Pendiente (Integrante 1):**
- Publicación en Internet con **Tailscale Funnel** (decidido en lugar de Cloudflare Tunnel:
  no requiere dominio, da HTTPS automático y no abre puertos). La web será pública; pgAdmin y
  demás interfaces administrativas, solo accesibles para el equipo vía la red privada de Tailscale.
- La integración final corre en **una sola máquina** (la que tiene el túnel). El despliegue del
  CI/CD apunta a esa máquina.

**Preguntas abiertas:**
- ¿Existe una base real con datos (detrás de `api.expojuy.com.ar`) para migrar con `pg_dump`?

## 10. Resumen de la consigna (puntos del TP)

1. **Diagnóstico:** stack, funcionalidades, diagrama inicial, qué contenerizar, repo público.
2. **Scrum:** Jira, backlog (incluye infra, pruebas, seguridad, docs), sprints, criterios de aceptación.
3. **Git:** ramas main/develop/feature/fix, PRs con revisión, rama principal protegida, sin secretos.
4. **BD en Docker:** contenedor, volúmenes, red interna, pgAdmin, migrar estructura y datos,
   backups, persistencia. **Dataset de ≥ 6.000.000 de registros por tabla**, documentar cantidad,
   tamaño, método, tiempo de carga y backups. Herramienta de análisis (pgBadger u otra).
5. **Optimización:** EXPLAIN / EXPLAIN ANALYZE, índices justificados, consultas no SARGables,
   **8 consultas optimizadas** con mediciones antes/después.
6. **Replicación:** nodo principal + réplica, verificación, retraso, simulación de caída,
   limitaciones. No afirmar failover automático sin demostrarlo.
7. **Contenerización web:** contenedores de backend y frontend, conexión a la BD, separar
   configuración de desarrollo y despliegue, evidencias en navegador.
8. **CI/CD:** verificaciones automáticas, build de imágenes, despliegue automático, secretos
   protegidos, commit de prueba, rollback.
9. **Internet:** servidor local con túnel seguro (Tailscale, WireGuard, Cloudflare…), HTTPS,
   no exponer BD ni administración, acceso desde fuera de la red, diagrama, riesgos, disponibilidad.
10. **Monitoreo:** Prometheus + Grafana, exportadores (SO, Docker, BD), dashboard con CPU, memoria,
    disco, red, contenedores, disponibilidad, BD, replicación; alertas probadas.
11. **Incidencias:** Mantis o GLPI, **≥ 10 incidencias** reales (al menos una de rendimiento y una
    de seguridad), vinculadas a commits.
12. **Nextcloud:** estructura de carpetas, permisos, documentación centralizada.
13. **n8n:** en Docker, credenciales protegidas, **≥ 3 flujos**, validación de datos, manejo de
    errores, webhooks autenticados, aprobación humana para acciones críticas.
14. **Seguridad:** matriz de amenazas, escaneo de vulnerabilidades y corrección, pruebas
    controladas, respuesta ante incidentes, flujo de incidentes integrado con n8n.
15. **Documentación (16 capítulos) y defensa oral** de 20 minutos.
