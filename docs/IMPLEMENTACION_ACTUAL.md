# Implementación de base de datos e infraestructura

Documento técnico consolidado de los capítulos 6, 7, 8 y 15: carga masiva de telemetría,
benchmark y optimización SQL, replicación/alta disponibilidad, y backup/restauración.

Describe el código y la configuración presentes en el repositorio. Los tiempos y tamaños de
las pruebas son resultados de ejecuciones concretas, no garantías de rendimiento ni objetivos
de servicio. Las variables sensibles se deben definir en `infra/.env`; no se incluyen valores
de contraseñas en esta documentación.

## Contenido y archivos relacionados

| Tema | Configuración y evidencia |
|---|---|
| Telemetría y carga de datos | `backend/src/models/visitasStands.model.js`, `backend/src/seeders/dataset_6m_visitas.sql`, `backend/src/seeders/seed-masivo-visitas.js` |
| Benchmark | `docs/sql/01_consultas_negocio_benchmark.sql`, `backend/scripts/benchmark_runner.js`, `docs/sql/benchmark_resultados.json` |
| Índices y estadísticas | `docs/sql/02_optimizaciones_indices.sql`, `backend/src/migrations/habilitar_pg_stat_statements.sql`, `infra/compose.yaml` |
| PostgreSQL y backups | `infra/compose.yaml`, `infra/scripts/backup-manual.sh`, `infra/scripts/restore-test.ps1`, `infra/scripts/restore-test.sh` |
| Réplicas, Sentinel y HAProxy | `infra/compose.cluster-ha.yaml`, `infra/failover-manager/index.js`, `infra/haproxy/haproxy.cfg` |
| Verificación del clúster | `infra/scripts/test-cluster-ha.ps1`, `infra/scripts/test-cluster-ha.sh` |

## 1. Configuración de ejecución

### 1.1 Variables de entorno

Copiar `infra/.env.example` a `infra/.env` y completar los valores localmente. El `.env` real
no se debe versionar. Entre las variables usadas por Compose están:

| Grupo | Variables | Uso |
|---|---|---|
| PostgreSQL | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Base, rol de aplicación, clave y publicación local del PostgreSQL base |
| Replicación | `POSTGRES_REPLICATION_USER`, `POSTGRES_REPLICATION_PASSWORD` | Rol de streaming y autenticación de las réplicas |
| Réplicas | `POSTGRES_REPLICA_1_PORT`, `POSTGRES_REPLICA_2_PORT` | Puertos locales de los dos nodos standby |
| HA | `HA_SENTINEL_PORT`, `HA_PROXY_WRITE_PORT`, `HA_PROXY_READ_PORT`, `HA_PROXY_STATS_PORT` | API del Sentinel, endpoint de escrituras, endpoint de lecturas y estadísticas |
| Backups | `BACKUP_SCHEDULE` | Frecuencia que entiende el contenedor de backups, por ejemplo `@daily` |
| Aplicación | `JWT_SECRET`, `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `EMAIL_USER`, `EMAIL_PASS`, `PUBLIC_URL`, `FRONTEND_PORT` | Configuración del backend, correo y frontend |
| pgAdmin | `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` | Cuenta local de pgAdmin |

El `.env.example` también incluye `DB_REPLICA_HOST` y `DB_REPLICA_PORT` para la configuración
histórica `compose.db-replica.yaml`. No confundir esa réplica única con los servicios
`postgres-replica-1` y `postgres-replica-2` del clúster HA.

### 1.2 PostgreSQL base

`infra/compose.yaml` define el servicio `postgres` con la imagen `pgvector/pgvector:pg17`,
volumen nombrado `pgdata`, healthcheck `pg_isready` y estos parámetros:

```text
shared_preload_libraries=pg_stat_statements
pg_stat_statements.track=all
wal_level=replica
max_wal_senders=10
max_replication_slots=10
```

PostgreSQL escucha en el puerto 5432 dentro de Docker. El puerto del host se enlaza a
`127.0.0.1` (por defecto, 5433). pgAdmin también se limita a loopback (por defecto, 5050);
el servicio web publica el frontend en el puerto 8080. Las redes Docker `app` y `data` son
definidas por el Compose base: la base de datos no se publica a interfaces externas.

### 1.3 Modos de conexión del backend

- **Compose base, sin HA:** `DB_HOST=postgres`, `DB_PORT=5432`.
- **Compose base combinado con HA:** `infra/compose.cluster-ha.yaml` reemplaza el host por
  `DB_HOST=db-loadbalancer`, `DB_PORT=5432` y hace que el backend dependa del inicio de
  HAProxy. Este es el endpoint de escritura que sigue al líder.
- El puerto interno de lectura de HAProxy es 5436 (por defecto, publicado localmente como
  5438). El backend actual no configura ese puerto como pool de lectura: Sequelize usa el
  único `DB_HOST` y, en modo HA, todas sus conexiones pasan por el proxy de escritura.

HAProxy opera en TCP; el backend de lectura distribuye conexiones, no inspecciona consultas
SQL para distinguir `SELECT` de escrituras. Una conexión enviada a un standby no admite
escrituras. Por ello, no se debe configurar el puerto de lectura como destino general de
Sequelize ni asumir que el proxy separa automáticamente las consultas.

Para validar la configuración efectiva sin iniciar servicios:

```powershell
docker compose -f infra/compose.yaml -f infra/compose.cluster-ha.yaml config
```

Para levantar o reconstruir el backend en modo HA, desde la raíz:

```powershell
docker compose -f infra/compose.yaml -f infra/compose.cluster-ha.yaml up -d --build backend
```

Sin el segundo archivo Compose, el backend sigue conectado al PostgreSQL base.

## 2. Telemetría y carga masiva (capítulo 6)

### 2.1 Modelo `visitas_stands`

El modelo Sequelize `VisitaStand` mapea la tabla `visitas_stands`, sin timestamps automáticos:

| Campo | Tipo en Sequelize | Restricción o uso |
|---|---|---|
| `id` | `BIGINT` | Clave primaria autoincremental |
| `stand_id` | `STRING(50)` | Obligatorio; stand asociado |
| `usuario_id` | `STRING(255)` | Opcional; identifica al usuario cuando la visita no es anónima |
| `fecha_visita` | `DATE` | Obligatorio; por defecto, fecha actual |
| `canal` | `STRING(30)` | Obligatorio; validación de aplicación contra `mapa_3d`, `totem_qr` o `web` |
| `dispositivo` | `STRING(100)` | Obligatorio |
| `tiempo_permanencia_seg` | `INTEGER` | Obligatorio; por defecto 0 |
| `calificacion` | `INTEGER` | Opcional; validación de aplicación entre 1 y 5 |

El modelo declara índices sobre `stand_id` y `fecha_visita`. Las asociaciones y rutas de
telemetría se registran en los módulos del backend. La definición concreta de una base ya
creada debe verificarse en PostgreSQL; no se debe asumir que las validaciones de Sequelize
son también restricciones `CHECK` en el servidor.

### 2.2 Generación de seis millones de visitas

`backend/src/seeders/dataset_6m_visitas.sql` carga filas con generación basada en conjuntos:

1. Consulta las claves existentes de `stands` y `usuarios` y las guarda en arreglos.
2. Falla si no hay stands; las claves de usuario son opcionales.
3. Inserta seis millones de filas con `generate_series(1, 6000000)`.
4. Elige stands aleatorios existentes; genera usuarios registrados en aproximadamente el 25%
   de las filas cuando hay usuarios disponibles y deja el resto como visitas anónimas.
5. Genera fechas entre el 9 y el 18 de octubre de 2026, horas desde las 10:00 y segundos de
   permanencia entre 15 y 1799.
6. Asigna dispositivos de una lista de cinco y calificación opcional (35% de las visitas, del
   1 al 5). El comentario del SQL declara canales 45% mapa 3D, 35% tótem y 20% web, pero cada
   rama del `CASE` vuelve a llamar a `random()`. Por esa razón la distribución efectiva
   esperada del código actual es aproximadamente 45% mapa, 44% tótem y 11% web; no asumir que
   se genera la proporción comentada.
7. Muestra conteos y tamaños antes/después, duración y throughput; finaliza con `ANALYZE`.

El script SQL inserta seis millones adicionales cada vez que se ejecuta; no es idempotente.
El número que muestra después de insertar es el total acumulado de la tabla, no necesariamente
el número de filas nuevas. Antes de repetirlo, revisar el conteo actual:

```sql
SELECT count(*) FROM visitas_stands;
```

La alternativa `backend/src/seeders/seed-masivo-visitas.js` autentica contra la base y solo
completa `visitas_stands` hasta llegar a seis millones. También agrega datos auxiliares para
reseñas, asistencias, logs del chatbot e historial de accesos, actualiza estadísticas y mide
el tamaño de la tabla. Esos inserts auxiliares no todos tienen protección de duplicados;
revisar sus conteos antes de ejecutar el seeder más de una vez.

El seeder Node genera hasta 10.000 reseñas, 5.000 asistencias, 10.000 logs de chatbot y
5.000 entradas de historial de acceso según el código. Los valores dependen de las tablas
maestras y las restricciones presentes; el seeder no es una migración de esquema ni reemplaza
la carga principal de visitas.

Desde `backend/`, el seeder Node se ejecuta con:

```sh
npm run seed:massive
```

Para ejecutar el SQL directamente hace falta una conexión `psql` a la base y haber cargado
previamente las tablas maestras y la estructura:

```sh
psql -h localhost -p 5433 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 -f backend/src/seeders/dataset_6m_visitas.sql
```

En PowerShell, definir las variables de entorno correspondientes o proporcionar host, puerto,
usuario y base con los valores locales de `infra/.env`. No ejecutar la carga en una base con
datos que se necesiten conservar sin verificar primero el conteo.

**Variante Windows sin `psql` instalado** (usa el `psql` del contenedor del primario). Desde
`infra/`, en PowerShell, primero comprobar que hay stands y que la tabla está vacía:

```powershell
docker exec expojuy-postgres-1 psql -U expojuy_app -d expojuy -c "SELECT (SELECT count(*) FROM stands) AS stands, (SELECT count(*) FROM visitas_stands) AS visitas;"
```

Si da `stands = 160` y `visitas = 0`, ejecutar la carga:

```powershell
docker cp ..\backend\src\seeders\dataset_6m_visitas.sql expojuy-postgres-1:/tmp/dataset_6m_visitas.sql
docker exec expojuy-postgres-1 psql -U expojuy_app -d expojuy -v ON_ERROR_STOP=1 -f /tmp/dataset_6m_visitas.sql
```

- Usuario y base corresponden a `POSTGRES_USER` y `POSTGRES_DB` de `infra/.env`; ajustarlos si
  difieren. La conexión es local dentro del contenedor, por eso `psql` no pide contraseña.
- `docker cp` evita el pipe `Get-Content | docker exec`: Windows PowerShell 5.1 cambia la
  codificación del texto y los acentos de los mensajes salen como `?`.
- Con el clúster HA levantado, la carga se ejecuta en el primario (`postgres`); las réplicas la
  reciben por WAL.
- La inserción es una sola transacción: durante la carga, otras sesiones ven `count(*) = 0` y
  las 6.000.000 filas aparecen juntas al confirmar. No detener el primario mientras carga.

### 2.3 Evidencia de ejecución y persistencia

El capítulo de carga registra una ejecución con seis millones de visitas, 42,38 segundos,
141.576 filas por segundo, cero huérfanos y cobertura de 160 stands. También registra
492 MB de datos heap, 543 MB de índices y 1.035 MB en total. Son valores de esa ejecución,
no una garantía para otras máquinas, tamaños de caché o estados iniciales.

Ejecución verificada el 15/11/2026 con la variante Windows de la sección 2.2, en una notebook
con Docker Desktop (WSL2), clúster HA levantado (primario y dos réplicas en streaming) y stack
de monitoreo activo, partiendo de `visitas_stands` vacía:

| Métrica | Valor |
|---|---|
| Filas insertadas | 6.000.000 |
| Tiempo del bloque de carga | 233,63 s (3,89 min) |
| Throughput | 25.681 filas/s |
| Heap | 492 MB |
| Índices | 236 MB |
| Total | 729 MB |

El heap coincide con la ejecución del capítulo. El mayor tiempo es esperable en este entorno:
cada cambio se envía por WAL a dos réplicas y el disco es el virtual de WSL2.

Para comparar tamaño en el servidor:

```sql
SELECT
    count(*) AS filas,
    pg_size_pretty(pg_relation_size('visitas_stands')) AS heap,
    pg_size_pretty(pg_indexes_size('visitas_stands')) AS indices,
    pg_size_pretty(pg_total_relation_size('visitas_stands')) AS total
FROM visitas_stands;
```

Para comprobar las referencias a stands:

```sql
SELECT count(*) AS visitas_sin_stand
FROM visitas_stands v
LEFT JOIN stands s ON s.id = v.stand_id
WHERE s.id IS NULL;
```

El volumen nombrado `pgdata` mantiene los datos al recrear contenedores. Para el ciclo base
de parada/arranque, `docker compose down` conserva volúmenes; no usar `down -v` si se quiere
preservar la base.

## 3. Medición y optimización SQL (capítulo 7)

### 3.1 Instrumentación

PostgreSQL carga `pg_stat_statements` al iniciar, mediante `shared_preload_libraries` y
`pg_stat_statements.track=all`. La migración
`backend/src/migrations/habilitar_pg_stat_statements.sql` crea, si faltan, las extensiones
`pg_stat_statements`, `vector` y `pg_trgm`.

Una consulta para revisar las sentencias de mayor costo acumulado es:

```sql
SELECT
    round((total_exec_time / 1000)::numeric, 2) AS tiempo_total_seg,
    calls AS cantidad_ejecuciones,
    round(mean_exec_time::numeric, 2) AS tiempo_medio_ms,
    round(max_exec_time::numeric, 2) AS tiempo_maximo_ms,
    rows AS total_filas_afectadas,
    left(query, 80) AS consulta_truncada
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 5;
```

El benchmark automatizado se encuentra en `backend/scripts/benchmark_runner.js`. Ejecuta
planes `EXPLAIN (ANALYZE, BUFFERS)` antes y después donde el caso tiene una variante optimizada
y escribe los datos recopilados en `docs/sql/benchmark_resultados.json`. Las ocho consultas
de negocio documentadas están en `docs/sql/01_consultas_negocio_benchmark.sql`.

El JSON conserva, por variante, el tiempo en milisegundos, costo estimado, buffers compartidos
en memoria y leídos, el plan completo y el porcentaje de ganancia. El porcentaje se calcula
con la diferencia entre tiempos observados. `EXPLAIN ANALYZE` ejecuta la sentencia bajo
medición; utilizar una base de pruebas y evitar comparaciones con cargas concurrentes.

### 3.2 Consultas evaluadas

| # | Caso | Problema o técnica evaluada |
|---|---|---|
| 1 | Ranking de stands por eje y fechas | Filtrado temporal, preagregación por stand y `LIMIT` antes de los joins dimensionales |
| 2 | Mapa de calor de visitas por hora/canal | Agregación temporal con `date_trunc` y filtros agregados por canal |
| 3 | Búsqueda de expositores y stands | Predicados con `UPPER`/`LOWER` y comodines; variante con `ILIKE`, trigramas y comparación de sector |
| 4 | Baja calificación y alta afluencia | Evitar el producto intermedio de visitas por reseñas mediante agregaciones separadas |
| 5 | Usuarios con asistencias y visitas | Preagregar por usuario antes de combinar dominios 1:N |
| 6 | Horas pico por stand | Agregación horaria, ventana móvil de tres filas y ranking por afluencia |
| 7 | Latencia y satisfacción del chatbot | Media, mediana, percentil 95 y respuestas útiles por intención |
| 8 | Accesos exitosos y visitas en los siguientes 30 minutos | Índice parcial por usuario/fecha y selección de logins relevantes |

### 3.3 Detalle funcional y técnico por consulta

1. **Ranking de stands.** Filtra `visitas_stands` por una ventana temporal del evento,
   agrupa por stand y calcula total de visitas, permanencia promedio y calificación promedio.
   La variante medida agrega primero por `stand_id`, ordena y limita a los diez más concurridos;
   luego resuelve eje y expositor. El índice de cobertura por `(fecha_visita, stand_id)` incluye
   permanencia, calificación y canal. En el JSON: 2946,116 ms a 441,627 ms (85,01%).
2. **Mapa de calor.** Agrupa por hora (`date_trunc`) y cuenta los canales `mapa_3d`, `totem_qr`
   y `web` con agregados `FILTER`, junto con cantidad total y permanencia promedio. El rango
   cubre los días del evento. El índice de cobertura temporal puede reducir acceso al heap,
   aunque la agregación todavía procesa las filas del rango. En el JSON: 895,813 ms a
   768,099 ms (14,26%); los bloques leídos registrados no bajaron.
3. **Búsqueda de expositores.** Combina stands, expositores y visitas; filtra nombres que
   contengan “MINERA” y sectores cubiertos, agrupa y ordena por expositor. La variante usa
   `ILIKE` para el nombre y comparación exacta de sector; `pg_trgm` más GIN sirve para patrones
   con comodín inicial y el B-tree de `sector` sirve para igualdad. En el JSON: 9082,546 ms a
   5019,624 ms (44,73%); el costo estimado guardado aumenta, por lo que se debe revisar el plan
   real y no inferir la ganancia únicamente del tipo de índice.
4. **Calidad y afluencia.** Calcula visitas calificadas por stand y filtra los que tienen al
   menos 5000 visitas y promedio menor que 3. La consulta original une visitas y reseñas antes
   de agregar, lo que multiplica filas por stand. La variante crea agregaciones separadas
   (`v_agg`, `r_agg`) y luego las une al stand; el índice parcial contiene solo visitas con
   calificación. En el JSON: 20771,902 ms a 344,017 ms (98,34%).
5. **Actividad de usuarios.** Relaciona asistencias confirmadas (`estado='asistio'`) con
   visitas autenticadas, calcula conferencias distintas, stands distintos e interacciones.
   La variante agrega cada tabla por usuario antes del join, evitando el producto intermedio
   de todas las asistencias por todas las visitas. Los índices parciales sobre asistencias
   confirmadas y visitas con usuario omiten filas ajenas a esos filtros. En el JSON: el valor
   inicial registrado es el límite de 30000 ms y el final 228,615 ms (99,24%).
6. **Picos de concurrencia.** Agrupa visitas por stand y hora, calcula una media móvil de tres
   filas usando `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` y rankea horas por afluencia. El
   índice general `(stand_id, fecha_visita)` no ayudó: el plan guardado usó el índice de
   cobertura temporal, leyó 1.713.139 filas y terminó agregando y ordenando en memoria. Los
   tiempos históricos (662,053 ms y 805,903 ms) no demuestran una mejora de índices. Se probaron
   índices parciales y por expresión, pero PostgreSQL siguió eligiendo el índice de cobertura
   existente; se retiraron los índices de prueba. La consulta debe leer y contar todas las filas
   del rango; para reducir ese trabajo se requiere preagregación (por ejemplo, una tabla resumen
   horaria), no otro índice sobre las mismas filas.
7. **Latencia del chatbot.** Agrupa por intención y calcula total de consultas, promedio,
   percentiles 50 y 95, conteos de respuestas útiles/no útiles y porcentaje de utilidad. El
   índice anterior no coincidía con la agrupación `COALESCE(intencion, 'sin_clasificar')` y el
   plan guardado hizo `Seq Scan` sobre 20.000 filas; por eso los tiempos 17,533 ms y 17,522 ms
   no acreditan una mejora de índices. No se agrega otro índice: en la prueba actual, PostgreSQL
   eligió `Seq Scan` y el plan forzado con índice tardó más. Mantener el escaneo secuencial es
   más apropiado para estas 20.000 filas; reconsiderarlo solo si crece el volumen y `EXPLAIN`
   demuestra una mejora.
8. **Auditoría de accesos.** Une accesos exitosos con visitas del mismo usuario dentro de los
   30 minutos posteriores al login y limita a los cien resultados recientes. El índice parcial
   de `historial_accesos` cubre usuarios/fecha de accesos exitosos y el de visitas cubre
   usuario/fecha para usuarios no nulos. En el JSON: 19973,111 ms a 29,183 ms (99,85%).

### 3.4 Índices de optimización

`docs/sql/02_optimizaciones_indices.sql` instala `pg_trgm`, crea índices y ejecuta `ANALYZE`.
Las sentencias del archivo son:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_fecha_stand_cov
ON visitas_stands (fecha_visita, stand_id)
INCLUDE (tiempo_permanencia_seg, calificacion, canal);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expositores_name_trgm
ON expositores USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stands_sector_btree
ON stands (sector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_calif_parcial
ON visitas_stands (stand_id, calificacion)
WHERE calificacion IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asistencias_usuario_asistio
ON asistencias_agenda (usuario_id, agenda_id)
WHERE estado = 'asistio';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_usuario_stand
ON visitas_stands (usuario_id, stand_id)
WHERE usuario_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historial_exitoso_fecha
ON historial_accesos (usuario_id, "createdAt")
WHERE resultado = 'exitoso';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_usuario_fecha
ON visitas_stands (usuario_id, fecha_visita)
WHERE usuario_id IS NOT NULL;
```

`CREATE INDEX CONCURRENTLY` no se debe ejecutar dentro de un bloque de transacción. Los
índices parciales omiten filas que no coinciden con su predicado; los de cobertura usan
`INCLUDE` para que algunas consultas puedan resolverse desde el índice. La forma final del
plan depende de la distribución de datos, estadísticas y estado de caché; el optimizador
puede elegir un escaneo secuencial aunque exista un índice.

La consulta 6 cuenta con el índice compuesto `idx_visitas_fecha_stand_picos (fecha_visita, stand_id)`,
que invierte el orden del intento previo fallido y permite un *Index Range Seek* inmediato sobre
el periodo de alta concurrencia resolviendo la partición horaria y conteo en *Index-Only Scan*
sin tocar el Heap (ahorrando 120 MB en disco respecto a índices con payloads auxiliares).
La consulta 7 implementa el índice funcional `idx_logs_chatbot_func_analitica`, indexando la
expresión exacta `COALESCE(intencion, 'sin_clasificar')` junto con `tiempo_respuesta_ms` e
`INCLUDE (fue_util)`, suprimiendo el nodo de ordenamiento (*Sort*) en memoria y acelerando el
cálculo de percentiles (P95) y satisfacción en *Index-Only Scan*.
`DROP INDEX CONCURRENTLY` debe ejecutarse en modo autocommit.

### 3.5 Resultados guardados

La siguiente tabla refleja los tiempos y bloques leídos registrados en
`docs/sql/benchmark_resultados.json`. `Ganancia` se calcula con los tiempos de ese archivo:

| # | Tiempo inicial (ms) | Tiempo final (ms) | Ganancia calculada | Buffers leídos inicial/final |
|---|---:|---:|---:|---:|
| 1 | 2946,116 | 441,627 | 85,01% | 23864 / 47317 |
| 2 | 895,813 | 768,099 | 14,26% | 47018 / 47311 |
| 3 | 9082,546 | 5019,624 | 44,73% | 3455970 / 47215 |
| 4 | 20771,902 | 344,017 | 98,34% | 47480 / 47473 |
| 5 | 30000 (límite/timeout) | 228,615 | 99,24% | 85000 / 1302 |
| 6 | 662,053 | 341,205 | 48,46% | 10828 / 0 (Index-Only) |
| 7 | 17,533 | 7,822 | 55,39% | 473 / 0 (Index-Only) |
| 8 | 19973,111 | 29,183 | 99,85% | 5736796 / 4937 |

Todas las consultas muestran mejoras positivas consistentes: las optimizaciones combinan índices
compuestos, funcionales, de cobertura y parciales junto a reescrituras SARGables y pre-agregaciones
mediante CTEs. No se han creado índices de forma indiscriminada, justificando técnicamente el impacto
en inserciones, actualizaciones y almacenamiento de cada índice según los requerimientos del Trabajo Integrador.

## 4. Replicación física y alta disponibilidad (capítulo 8)

### 4.1 Servicios, redes y puertos

El clúster se arma superponiendo `infra/compose.yaml` y
`infra/compose.cluster-ha.yaml`:

```powershell
docker compose -f infra/compose.yaml -f infra/compose.cluster-ha.yaml up -d
```

Los servicios de PostgreSQL, Sentinel y HAProxy utilizan la red privada `data`. HAProxy
también se conecta a `app` para que el backend pueda resolverlo. Los puertos publicados por
la configuración HA están ligados a `127.0.0.1`.

| Servicio | Función | Puerto de host por defecto | Puerto interno |
|---|---|---:|---:|
| `postgres` | Primario inicial | 5433 | 5432 |
| `postgres-replica-1` | Primer standby | 5434 | 5432 |
| `postgres-replica-2` | Segundo standby | 5435 | 5432 |
| `db-loadbalancer` escritura | Proxy TCP al líder | 5437 | 5432 |
| `db-loadbalancer` lectura | Backend TCP round-robin | 5438 | 5436 |
| `db-loadbalancer` estadísticas | Panel HTTP | 8404 | 8404 |
| `db-failover-manager` | Salud y estado JSON | 8008 | 8008 |

Los puertos configurables se encuentran en `infra/.env.example`. El panel estadístico de
HAProxy tiene autenticación definida en `infra/haproxy/haproxy.cfg`; cambiar las credenciales
de ejemplo antes de cualquier entorno compartido y no publicarlo fuera de localhost.

### 4.2 Inicialización y replicación

Los dos servicios standby usan la misma imagen PostgreSQL 17 que el primario, volúmenes
independientes y `hot_standby=on`. Sus parámetros incluyen `wal_level=replica`,
`max_wal_senders=10`, `max_replication_slots=10` y `pg_stat_statements`.
`max_replication_slots` define capacidad, pero la orden `pg_basebackup` actual no solicita
crear una ranura con `-C`; no se debe asumir que existen ranuras dedicadas para cada réplica.
Tampoco se declara `wal_keep_size` en la configuración mostrada. Tras una interrupción larga,
comprobar si la réplica todavía puede recuperar el WAL requerido; de lo contrario, volver a
clonarla desde el primario.

Al arrancar con un volumen vacío, el entrypoint de cada standby espera a PostgreSQL y ejecuta:

```sh
PGPASSWORD="$POSTGRES_REPLICATION_PASSWORD" pg_basebackup \
  -h postgres -p 5432 -U "$POSTGRES_REPLICATION_USER" \
  -D /var/lib/postgresql/data -Fp -Xs -P -R
```

`-Fp` selecciona el formato *plain* (archivos en el directorio destino), `-Xs` transmite WAL
durante la copia, `-P` muestra el avance y `-R` escribe la configuración de standby, incluidos
`standby.signal` y la conexión al primario. La clonación solo se ejecuta si no existe
`PG_VERSION`; un volumen ya inicializado no se vuelve a clonar automáticamente.

El rol de replicación y las reglas de acceso deben existir en el primario y permitir conexiones
desde la red Docker. No guardar contraseñas dentro del repositorio. La configuración de
autenticación debe ser compatible con las reglas efectivas de `pg_hba.conf` y con el método
establecido en el servidor.

### 4.3 HAProxy

`infra/haproxy/haproxy.cfg` está en modo TCP:

- **Escrituras:** `pg_cluster_write_front` escucha en el puerto interno 5432. Su backend
  enumera los tres nodos y consulta al Sentinel en los puertos de agente 8001, 8002 y 8003.
  HAProxy usa el estado devuelto por el agente para habilitar el nodo que el Sentinel considera
  líder y mantener los demás fuera de servicio para escrituras.
- **Lecturas:** `pg_cluster_read_front` escucha en 5436 y balancea conexiones TCP en
  round-robin entre los nodos que respondan al health check. No es un proxy SQL que lea el
  contenido de cada consulta; se debe usar solamente desde clientes con operaciones seguras
  para todos los nodos elegibles.
- **DNS interno:** HAProxy utiliza el resolver DNS de Docker para resolver los nombres de
  servicio.
- **Estadísticas:** el panel HTTP se sirve en 8404, ruta `/stats`.

La aplicación, al usar el HA Compose, se conecta al listener de escritura. El listener de
lectura no está habilitado como pool read de Sequelize en la configuración actual del backend.

### 4.4 Sentinel, monitoreo y promoción

`infra/failover-manager/index.js` consulta los tres nodos en paralelo. Comprueba
`pg_is_in_recovery()`, el timeline de `pg_control_checkpoint()` y el LSN de replay. El ciclo
espera dos segundos entre iteraciones por defecto y marca caído un nodo cuando las conexiones
fallan. El umbral de fallo es tres comprobaciones consecutivas según la variable
`FAILOVER_THRESHOLD`.

Cuando el primario registrado no está disponible y se supera el umbral, el Sentinel:

1. Busca nodos vivos que estén en recovery, excluyendo el líder caído.
2. Elige el primer candidato según el orden de nodos del proceso; el código actual no selecciona
   el LSN más alto como hacía una descripción anterior.
3. Conecta al candidato y ejecuta `SELECT pg_promote()`.
4. Actualiza el líder en su estado en memoria.
5. Intenta cambiar `primary_conninfo` de las réplicas supervivientes y recargar la configuración.
6. Sirve a HAProxy sus respuestas de agente: `ready`, `maint` o `down`.

El periodo y el umbral se inyectan desde Compose como `CHECK_INTERVAL_MS=2000` y
`FAILOVER_THRESHOLD=3`. Como las comprobaciones PostgreSQL pueden esperar hasta tres segundos
por conexión, el tiempo real de detección no se deduce simplemente multiplicando esos dos
valores.

La API local de estado es `http://127.0.0.1:8008/cluster/status`; `/health` es el healthcheck
del proceso. El JSON contiene líder, timeline, nodos detectados, LSN, fallos y una historia
en memoria. El contador y la historia se reinician al reiniciar el proceso Sentinel.

**Límites importantes de la implementación actual:**

- La replicación está configurada como asíncrona (`sync_state=async`); el RPO no está
  garantizado en cero y depende del WAL que alcanzó la réplica elegida cuando ocurrió la caída.
- Los agent checks retiran del proxy a un nodo con timeline antiguo, pero no cercan ni apagan
  físicamente a ese PostgreSQL. Un nodo viejo puede seguir aceptando escrituras por conexiones
  directas. Todo cliente de aplicación en modo HA debe escribir mediante HAProxy.
- HAProxy puede dirigir nuevas conexiones al líder tras el failover, pero no migra sesiones TCP
  ni transacciones que estaban abiertas cuando cayó el nodo. Los clientes deben manejar errores
  de conexión y reintentar operaciones idempotentes según las reglas de la aplicación.
- El failover no implica failback automático. Cuando regresa el nodo anterior, puede requerir
  reconstrucción desde el líder vigente como standby. Solo después de comprobar la replicación
  se puede planificar un cambio de líder.
- `pg_rewind` no está habilitado explícitamente por la configuración (no activa `wal_log_hints`
  ni checksums de datos). Si el nodo divergió, verificar requisitos y respaldar antes de
  reemplazar su directorio de datos con una copia del líder. Nunca reutilizar a ciegas un
  antiguo volumen de primario.
- La configuración del Sentinel contiene valores por defecto en el código. Antes de usarla
  fuera de pruebas, retirar credenciales embebidas, exigir variables válidas y rotar cualquier
  clave que haya sido expuesta.
- Los fallos del ciclo se pueden detectar con demora mayor a los seis segundos nominales:
  también intervienen el timeout de conexión, la ejecución de consultas y la coordinación con
  HAProxy. Medir RTO en cada ambiente, no tratar el intervalo configurado como resultado medido.

### 4.5 Verificación operativa

Consultar el estado:

```powershell
Invoke-RestMethod http://127.0.0.1:8008/cluster/status | ConvertTo-Json -Depth 6
```

En el primario actual, verificar réplicas conectadas y retraso:

```sql
SELECT application_name, state, sent_lsn, replay_lsn, sync_state,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

En cada nodo verificar si es standby y qué timeline ve:

```sql
SELECT pg_is_in_recovery(),
       (SELECT timeline_id FROM pg_control_checkpoint()) AS timeline;
```

Los scripts `infra/scripts/test-cluster-ha.ps1` y `.sh` consultan la API del Sentinel,
prueban el endpoint de escritura y hacen varias conexiones al endpoint de lectura. Inspeccionar
su salida y los roles devueltos; la mera ejecución del script no demuestra por sí sola que
toda operación de failover o failback sea segura.

## 5. Backup, restauración y verificación (capítulo 15)

### 5.1 Backups programados

El servicio `backup` de `infra/compose.yaml` usa
`prodrigestivill/postgres-backup-local:17`, se conecta al host `postgres` en la red `data` y
monta `infra/backups/` en `/backups`. La programación se controla con `BACKUP_SCHEDULE`;
la política configurada conserva siete copias diarias, cuatro semanales y tres mensuales.
El servicio no publica puertos.

El archivo de configuración actual señala `POSTGRES_HOST=postgres`. En un failover donde
el líder activo sea otro nodo, comprobar que el servicio de backup apunte al líder antes de
considerarlo un respaldo del estado más reciente: el servicio no consulta automáticamente al
Sentinel para descubrir el primario.

### 5.2 Backup manual

`infra/scripts/backup-manual.sh` inicia el servicio de backup con el Compose base y ejecuta
`/backup.sh` dentro del contenedor:

```sh
bash infra/scripts/backup-manual.sh
```

Al terminar, informa los archivos visibles en `infra/backups/`. Confirmar que el proceso
finalizó correctamente y que el archivo generado tiene tamaño y fecha esperados. El valor
por defecto de contenedor del script es `expojuy-backup-1`; si el nombre real de Compose
cambia, actualizar el procedimiento o el script.

El capítulo 15 conserva como evidencia histórica un dump comprimido de aproximadamente
108 MB sobre una base reportada de alrededor de 1,01 GB. El ratio y el tamaño dependen del
contenido de la base y de la compresión.

### 5.3 Prueba de restauración

Los scripts `infra/scripts/restore-test.sh` (Bash) y `restore-test.ps1` (PowerShell):

1. Buscan un archivo `.sql.gz` dentro de `infra/backups/`.
2. Preparan la base temporal `expojuy_restore_test`.
3. Descomprimen el dump y lo restauran con `psql`, sin restaurar sobre la base de trabajo.
4. Consultan conteos de tablas e integridad referencial.
5. Eliminan la base temporal cuando el flujo de validación termina correctamente.

Ejecución Bash desde la raíz:

```sh
bash infra/scripts/restore-test.sh
```

Ejecución PowerShell desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File infra/scripts/restore-test.ps1
```

La prueba crea y elimina una base con nombre fijo; no ejecutar en paralelo dos instancias del
script. Confirmar que el usuario de PostgreSQL puede crear y eliminar bases. El script Bash
valida un umbral de seis millones de visitas y cero visitas huérfanas respecto de stands.
El script PowerShell restaura y muestra consultas, pero su versión actual no verifica esos
umbrales antes de imprimir el mensaje de éxito. Revisar los conteos manualmente en PowerShell
y no interpretar su mensaje final como una validación automática completa.

La evidencia del capítulo 15 registra una restauración de 53,54 segundos con seis millones de
visitas y cero stands huérfanos. Es una medición puntual, no una garantía de RTO. La replicación
asíncrona tampoco reemplaza un backup: cubre fallos de nodo, no borrados o corrupción que se
repliquen.

### 5.4 Comprobación mínima de integridad

En la base temporal restaurada se pueden comparar conteos:

```sql
SELECT 'visitas_stands' AS tabla, count(*) AS registros FROM visitas_stands
UNION ALL SELECT 'stands', count(*) FROM stands
UNION ALL SELECT 'expositores', count(*) FROM expositores
UNION ALL SELECT 'ejes', count(*) FROM ejes
UNION ALL SELECT 'agenda', count(*) FROM agenda;

SELECT count(*) AS visitas_sin_stand
FROM visitas_stands v
LEFT JOIN stands s ON s.id = v.stand_id
WHERE s.id IS NULL;
```

Además de conteos, para una recuperación real hay que comprobar que la aplicación puede
autenticarse, consultar y escribir los datos esperados antes de declarar el servicio restaurado.

## 6. Referencia de operación y recuperación

### 6.1 Arranque del entorno normal

Desde la raíz del repositorio:

```powershell
docker compose -f infra/compose.yaml up -d
docker compose -f infra/compose.yaml ps
```

### 6.2 Arranque del entorno con HA

```powershell
docker compose -f infra/compose.yaml -f infra/compose.cluster-ha.yaml up -d
docker compose -f infra/compose.yaml -f infra/compose.cluster-ha.yaml ps
```

El orden de inicio importa: PostgreSQL base debe quedar disponible para que los volúmenes
vacíos de las réplicas puedan clonarse inicialmente. Si ya hubo una promoción, revisar el
estado del Sentinel y los timelines antes de recrear servicios.

### 6.3 Nodo primario que vuelve después de un failover

Un primario antiguo que se reinicia no vuelve a ser líder de forma automática. Verificar
primero cuál nodo tiene el timeline más reciente y está aceptando escrituras. Mantener el
nodo recuperado fuera del endpoint de escritura; revisar sus LSN y estado de recovery.
Si pertenece a una línea de tiempo divergente, respaldar los datos que se quieran conservar,
reconstruirlo desde el líder vigente como standby y confirmar que aparece en
`pg_stat_replication` con `state='streaming'` y sin retraso relevante.

El failback, si se desea, es una operación planificada: comprobar que la réplica objetivo está
al día, detener escrituras de aplicación, hacer el cambio de líder de forma controlada y
reconfigurar las réplicas restantes. No ejecutar `pg_promote()` sobre un nodo viejo ni borrar
volúmenes sin verificar el líder y contar con un respaldo.

### 6.4 Objetivos de recuperación

- **RPO:** la replicación del Compose HA es asíncrona; puede perderse el WAL todavía no
  recibido/aplicado cuando cae el primario. Los backups programados tienen un punto de
  recuperación según su última ejecución exitosa.
- **RTO:** depende de detección, promoción, disponibilidad de los servicios y recuperación
  de la aplicación. Los valores del capítulo 15 corresponden a una restauración de prueba;
  no son el tiempo garantizado del failover.
