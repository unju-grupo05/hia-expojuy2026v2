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
│   ├── Dockerfile   Build multi-stage: Node 22 → nginx-unprivileged (puerto 8080)
│   └── docker/nginx/default.conf.template
├── backend/         VACÍO: falta incorporar el código (Node.js + Express 5 + Sequelize 6)
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
| Backend (pendiente de incorporar) | Node.js, Express 5, Sequelize 6, JWT, bcryptjs, multer + sharp, nodemailer, Swagger |
| Base de datos | PostgreSQL 17 con extensión pgvector disponible |
| Contenedores | Docker + Docker Compose |
| Servidor web | Nginx (dentro de la imagen del frontend) |

Modelos del backend según el plan: `Stand`, `UbicacionStand`, `Expositor`, `Noticia`, `Galeria`,
`Agenda`, `Eje`, `Correo`, `Usuario`, `Media`, `ReunionB2B`, `AuditoriaAccion`, `HistorialAcceso`.

## 4. Infraestructura actual (`infra/compose.yaml`)

Proyecto Compose llamado `expojuy`. Se levanta desde `infra/` con `docker compose up -d`.

| Servicio | Imagen | Acceso desde el host | Redes | Volumen |
|---|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg17` | `127.0.0.1:5433` | `data` | `pgdata` |
| `pgadmin` | `dpage/pgadmin4:9` | `127.0.0.1:5050` | `data` | `pgadmin-data` |
| `backup` | `prodrigestivill/postgres-backup-local:17` | — | `data` | `./backups` (fuera de Git) |
| `frontend` | build de `../frontend` | `0.0.0.0:8080` | `app` | — |

**Redes:**
- `app`: tráfico web (frontend y, cuando exista, backend).
- `data`: base de datos y sus herramientas. Solo se conecta quien necesita la base.
  El frontend **no** está en `data` y no puede llegar a Postgres (verificado).

**Detalles importantes:**
- Postgres usa el puerto **5433** en el host para no chocar con un Postgres instalado localmente.
  Dentro de Docker el puerto es el normal: **host `postgres`, puerto `5432`**.
- Postgres y pgAdmin solo escuchan en `127.0.0.1`: no son accesibles desde la red.
- Usuario, contraseña y nombre de la base se leen del `.env` **solo la primera vez** (volumen vacío).
  Cambiarlos después en el `.env` no tiene efecto; hay que hacerlo con SQL o borrar el volumen
  (`docker compose down -v`, **borra todos los datos**).
- La base arranca **vacía**. Las tablas las crea el backend (Sequelize) o una migración de la
  base existente. El compose no crea tablas.
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
- Mientras no exista el backend, `/api` responde **502**. Es lo esperado.
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
| 2 | DBA: dataset de 6.000.000 de registros, optimización de 8 consultas, replicación, backups | 4 (datos), 5, 6 |
| 3 | CI/CD (GitHub Actions) y monitoreo (Prometheus + Grafana) | 8, 10 |
| 4 | n8n: 3 flujos (alertas → incidencia, verificación de backups, IA/RAG) | 13 |
| 5 | Scrum (Jira), Gitflow, Mantis/GLPI, Nextcloud, seguridad, documento final | 2, 3, 11, 12, 14, 15 |

## 9. Estado actual y pendientes

**Hecho:**
- Monorepo con `frontend/`, `backend/` (vacío) e `infra/`.
- Imagen Docker del frontend (86.6 MB, sin root, healthcheck en `/healthz`).
- Compose base con Postgres, pgAdmin, backups y frontend, con pruebas de persistencia,
  backup/restauración y aislamiento.

**Pendiente (Integrante 1):**
- Incorporar el backend a `backend/`, su Dockerfile y el servicio en el compose.
- Publicación en Internet con **Tailscale Funnel** (decidido en lugar de Cloudflare Tunnel:
  no requiere dominio, da HTTPS automático y no abre puertos). La web será pública; pgAdmin y
  demás interfaces administrativas, solo accesibles para el equipo vía la red privada de Tailscale.
- La integración final corre en **una sola máquina** (la que tiene el túnel). El despliegue del
  CI/CD apunta a esa máquina.

**Preguntas abiertas:**
- ¿Dónde está el repo del backend y quién tiene acceso?
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
