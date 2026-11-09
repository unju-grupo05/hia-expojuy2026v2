# ExpoJuy 2026

Web de la ExpoJuy 2026 y su infraestructura completa, desarrollada como Práctica Integradora Final.

| Carpeta | Contenido |
|---|---|
| `frontend/` | App Angular 21 |
| `backend/` | API Node.js + Express |
| `infra/` | Docker Compose del entorno |
| `docs/` | Plan de trabajo, consigna y contexto del proyecto |

## Levantar el entorno

Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cd infra
cp .env.example .env    # completar contraseñas; JWT_SECRET de al menos 32 caracteres
docker compose up -d --build
```

| Servicio | URL |
|---|---|
| Web | http://localhost:8080 |
| API (salud) | http://localhost:8080/api/health |
| Panel de administración | http://localhost:8080/admin/login (credenciales: `ADMIN_INITIAL_*` del `.env`) |
| pgAdmin | http://localhost:5050 (servidor: host `postgres`, puerto `5432`) |
| PostgreSQL desde la PC | `localhost:5433` |

## Carga Masiva de Datos y Pruebas de Rendimiento (Puntos 4, 5 y 6 — DBA)

Para replicar el entorno completo del Senior DBA con el dataset masivo de telemetría (6M de filas), optimizaciones SQL y clúster HA de 3 nodos:

### 1. Cargar el Dataset Masivo de 6.000.000 de Registros (Punto 4)
El repositorio incluye un script SQL optimizado con `generate_series()` que puebla la tabla `visitas_stands` en 1 a 2 minutos (~1,3 GB en disco):

- **En PowerShell (Windows):**
  ```powershell
  cd infra
  Get-Content ..\backend\src\seeders\dataset_6m_visitas.sql | docker compose exec -T postgres psql -U expojuy_app -d expojuy
  ```
- **En Bash (Linux / macOS):**
  ```bash
  cd infra
  docker compose exec -T postgres psql -U expojuy_app -d expojuy < ../backend/src/seeders/dataset_6m_visitas.sql
  ```

*Verificar que se cargaron los 6 millones:*
```bash
docker compose exec -T postgres psql -U expojuy_app -d expojuy -c "SELECT count(*) FROM visitas_stands;"
```

### 2. Aplicar Índices y Optimizaciones SQL (Punto 5)
Aplica los índices B-Tree compuestos, de cobertura (`INCLUDE`), parciales y funcionales sobre el dataset:

- **En PowerShell:**
  ```powershell
  Get-Content ..\docs\sql\02_optimizaciones_indices.sql | docker compose exec -T postgres psql -U expojuy_app -d expojuy
  ```
- **En Bash:**
  ```bash
  docker compose exec -T postgres psql -U expojuy_app -d expojuy < ../docs/sql/02_optimizaciones_indices.sql
  ```

### 3. Ejecutar el Benchmark Automatizado de Consultas SQL (Punto 5)
Ejecuta la suite de 8 consultas pesadas de negocio comparando *Baseline* vs *Optimizado* con `EXPLAIN (ANALYZE, BUFFERS)`:
```bash
cd backend
npm install
node scripts/benchmark_runner.js
```
*(Los resultados y métricas de ganancia se exportan automáticamente en `docs/sql/benchmark_resultados.json`).*

### 4. Levantar y Probar el Clúster HA de 3 Nodos y Auto-Failover (Punto 6)
Para probar la alta disponibilidad con 3 nodos PostgreSQL (Primary + 2 Standbys), balanceo HAProxy y Sentinel Failover Manager:

1. **Asegurar variables en `infra/.env`:** Copiar las variables de clúster desde `infra/.env.example` (`POSTGRES_REPLICA_1_PORT`, `HA_PROXY_*`, etc.).
2. **Levantar el clúster HA:**
   ```bash
   cd infra
   docker compose -f compose.yaml -f compose.cluster-ha.yaml up -d
   ```
3. **Ejecutar la suite automatizada de pruebas de failover:**
   - En Windows (PowerShell):
     ```powershell
     cd infra
     .\scripts\test-cluster-ha.ps1
     ```
   - En Linux / macOS:
     ```bash
     cd infra
     ./scripts/test-cluster-ha.sh
     ```
4. **Interfaces de monitoreo del clúster:**
   - Panel web de HAProxy: [http://localhost:8404/stats](http://localhost:8404/stats) (usuario `admin`, clave `expojuy_ha_secret_2026`).
   - Estado JSON del Sentinel: [http://localhost:8008/cluster/status](http://localhost:8008/cluster/status).
   - Puerto de escrituras balanceado (Líder activo): `localhost:5437`.
   - Puerto de lecturas balanceado (Round-Robin entre 3 nodos): `localhost:5438`.

## Cómo contribuir

1. Crear una rama desde `develop`: `feature/...`, `fix/...` o `docs/...`.
2. Commits con formato `tipo(ámbito): descripción`, por ejemplo `feat(infra): agregar grafana`.
3. Abrir un Pull Request contra `develop` con un compañero como revisor.
4. Nunca subir `.env`, contraseñas, tokens ni dumps de la base.

Contexto completo, decisiones y reglas para agregar servicios: [`docs/CONTEXTO_PROYECTO.md`](docs/CONTEXTO_PROYECTO.md).
