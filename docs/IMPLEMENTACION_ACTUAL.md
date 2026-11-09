# Implementación actual de base de datos e infraestructura

Este documento consolida la funcionalidad de base de datos que está implementada en el
repositorio. Se limita a describir código, scripts y configuración existentes; no presenta
como resultados comprobados las métricas que no se pueden verificar en esos archivos.

## Telemetría y carga de datos

- El backend incluye modelos y endpoints para registrar visitas a stands y otras actividades
  de telemetría.
- `backend/src/seeders/dataset_6m_visitas.sql` genera e inserta seis millones de visitas
  sintéticas en `visitas_stands` mediante `generate_series()`. El script calcula métricas de
  filas y almacenamiento antes y después, y actualiza las estadísticas de la tabla.
- La carga requiere stands existentes y utiliza usuarios semilla cuando están disponibles.

## Consultas y rendimiento

- PostgreSQL se configura con `pg_stat_statements` en `infra/compose.yaml`; la migración
  correspondiente está en `backend/src/migrations/habilitar_pg_stat_statements.sql`.
- `docs/sql/01_consultas_negocio_benchmark.sql` contiene consultas de análisis y
  `docs/sql/02_optimizaciones_indices.sql` define índices y actualiza estadísticas para las
  tablas involucradas.
- `backend/scripts/benchmark_runner.js` ejecuta el benchmark y
  `docs/sql/benchmark_resultados.json` conserva sus resultados.

## Replicación y alta disponibilidad

- `infra/compose.db-replica.yaml` define un servicio PostgreSQL adicional para el entorno de
  replicación.
- `infra/compose.cluster-ha.yaml` configura dos nodos standby junto al PostgreSQL principal,
  HAProxy y el servicio `db-failover-manager`. Los puertos publicados por esta configuración
  se enlazan a `127.0.0.1`.
- `infra/haproxy/haproxy.cfg` define un backend de escritura que usa comprobaciones del
  Sentinel para seleccionar nodos y un backend de lectura con balanceo round-robin.
- `infra/failover-manager/index.js` consulta el estado de los nodos, incluye la promoción de
  una réplica con `pg_promote()` y expone endpoints de salud y estado del clúster.
- Hay scripts de comprobación en `infra/scripts/test-cluster-ha.ps1` y
  `infra/scripts/test-cluster-ha.sh`. La existencia de la configuración y de estos scripts
  no implica que el failover haya sido validado en cada entorno.

Para levantar el entorno HA, la configuración indica combinar los archivos Compose desde
`infra/`:

```sh
docker compose -f compose.yaml -f compose.cluster-ha.yaml up -d
```

## Backups y restauración

- `infra/compose.yaml` configura el servicio de backups con programación configurable y
  retención de copias diarias, semanales y mensuales.
- `infra/scripts/backup-manual.sh` permite solicitar un backup manual.
- `infra/scripts/restore-test.ps1` y `infra/scripts/restore-test.sh` restauran un archivo
  comprimido en una base temporal y comprueban conteos e integridad referencial.

## Alcance

No se incluyen aquí planes futuros ni afirmaciones sobre tickets de Mantis, tiempos de carga,
mejoras porcentuales de rendimiento o tiempos de restauración que no estén demostrados por
la configuración o el código actual.
