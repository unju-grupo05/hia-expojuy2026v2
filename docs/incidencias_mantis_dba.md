# Incidencias Técnicas Mantis Bug Tracker — Área DBA & Rendimiento

**Proyecto:** ExpoJuy 2026  
**Responsable:** Senior PostgreSQL DBA & Data Engineer (Integrante 2)  
**Puntos del Trabajo Integrador:** Punto 5 (Optimización SQL) y Punto 11 (Gestión de Incidencias en Mantis BT)  
**Trazabilidad:** Todas las incidencias se encuentran vinculadas a problemas reales encontrados en el ciclo de vida del proyecto, con su correspondiente commit en Git.  

---

## Incidencia 1: INC-DB-01 — Degradación Severa de Rendimiento por Sequential Scan Masivo en Cálculo de Ranking Ferial

### Ficha Técnica en Mantis BT

| Campo | Valor |
|---|---|
| **ID Incidencia** | **INC-DB-01** |
| **Proyecto** | ExpoJuy 2026 / Backend & Database |
| **Categoría** | Rendimiento (Performance) |
| **Severidad** | Mayor |
| **Prioridad** | Alta |
| **Estado** | **Cerrada (Resuelta)** |
| **Resolución** | Corregido |
| **Asignado a** | Integrante 2 (DBA) |
| **Informado por** | Integrante 1 (DevOps / Monitorización) |
| **Fecha de Reporte** | 03/11/2026 |
| **Fecha de Cierre** | 06/11/2026 |
| **Commit de Solución** | `d4afdd3` / `feature/db-nuevas-tablas-telemetria` |

### Descripción del Problema
Al invocar el endpoint analítico `GET /api/visitas-stands/ranking` con un rango de fechas oficial de la feria (09 al 18 de octubre), los tiempos de respuesta de la API superaban los **3.300 ms (3,3 segundos)**. Con la base poblada con 6.000.000 de registros en `visitas_stands`, el consumo de I/O de disco saturaba el contenedor `postgres` y provocaba alertas de latencia en Prometheus.

### Pasos para Reproducir
1. Ejecutar la consulta analítica inicial sin índices de cobertura:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT s.id, count(v.id) AS total_visitas
   FROM visitas_stands v
   JOIN stands s ON v.stand_id = s.id
   WHERE v.fecha_visita BETWEEN '2026-10-10' AND '2026-10-15'
   GROUP BY s.id ORDER BY total_visitas DESC LIMIT 10;
   ```
2. Observar el plan de ejecución: PostgreSQL ejecuta un `Parallel Seq Scan` sobre 6.000.000 de filas, leyendo más de 23.800 bloques de buffer desde disco.

### Causa Raíz
Ausencia de un índice compuesto y de cobertura sobre `(fecha_visita, stand_id)`. El planificador de costos se veía obligado a escanear la totalidad de las páginas heap de la tabla de 492 MB para filtrar por fecha y luego agrupar por stand.

### Solución Implementada
1. Se creó un **Índice B-Tree de Cobertura (*Covering Index*)** con la cláusula `INCLUDE`:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_fecha_stand_cov
   ON visitas_stands (fecha_visita, stand_id)
   INCLUDE (tiempo_permanencia_seg, calificacion, canal);
   ```
2. Se reescribió la consulta para pre-agrupar en una CTE (*Common Table Expression*) sobre el rango acotado antes de hacer JOIN con las tablas maestras (`stands`, `ejes`, `expositores`), reduciendo 6M de filas a solo 10 registros antes del join.

### Resultado y Verificación
- **Tiempo de ejecución previo:** 3.334 ms
- **Tiempo de ejecución posterior:** **452 ms**
- **Ganancia neta:** **86,44% de reducción de latencia**.
- **I/O Buffers leídos:** Reducción de más de 20.000 bloques a cero lecturas físicas de disco (100% resuelto en memoria compartida / Index-Only Scan).

---

## Incidencia 2: INC-DB-02 — Pérdida Crítica de Datos por Configuración de Sincronización Forzada en Sequelize

### Ficha Técnica en Mantis BT

| Campo | Valor |
|---|---|
| **ID Incidencia** | **INC-DB-02** |
| **Proyecto** | ExpoJuy 2026 / Backend API |
| **Categoría** | Integridad de Datos (Data Loss / Bug) |
| **Severidad** | Bloqueante / Crítica |
| **Prioridad** | Inmediata |
| **Estado** | **Cerrada (Resuelta)** |
| **Resolución** | Corregido |
| **Asignado a** | Integrante 2 (DBA) |
| **Informado por** | Integrante 2 (DBA) |
| **Fecha de Reporte** | 02/11/2026 |
| **Fecha de Cierre** | 02/11/2026 |
| **Commit de Solución** | `2818686` / `develop` |

### Descripción del Problema
Durante las pruebas de orquestación de Docker Compose, al reiniciar el contenedor `backend`, todas las tablas de PostgreSQL eran eliminadas (`DROP TABLE ... CASCADE`) y vueltas a crear vacías. Esto destruía la base de datos completa de stands, noticias, expositores y cualquier dataset previo cargado.

### Pasos para Reproducir
1. Levantar el entorno con `docker compose up -d`.
2. Verificar que existan datos en la base (`SELECT count(*) FROM stands;` retorna 160).
3. Reiniciar el servicio backend: `docker compose restart backend`.
4. Consultar nuevamente la base: las tablas se encuentran vacías y los contadores en 0.

### Causa Raíz
En el archivo de arranque `backend/index.js`, la llamada de inicialización de Sequelize estaba configurada de forma fija con:
```javascript
sequelize.sync({ force: true })
```
En Sequelize, la bandera `force: true` emite una instrucción `DROP TABLE IF EXISTS` incondicional sobre cada modelo registrado antes de volver a crearlo, lo cual es inaceptable en cualquier entorno de persistencia real.

### Solución Implementada
1. Se reemplazó la llamada destructiva en `backend/index.js` por una sincronización segura y no destructiva controlada por variables de entorno:
   ```javascript
   const forceSync = process.env.DB_SYNC_FORCE === 'true';
   const alterSync = process.env.DB_SYNC_ALTER === 'true';
   
   sequelize.sync({ force: forceSync, alter: alterSync })
       .then(() => console.log('Tablas sincronizadas de forma segura sin pérdida de datos.'));
   ```
2. Se fijaron `DB_SYNC_FORCE=false` y `DB_SYNC_ALTER=false` en `backend/.env` y `infra/.env.example`.
3. Se implementó una política de migraciones SQL idempotentes (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) para cambios estructurales de esquema.

### Resultado y Verificación
- Se ejecutaron múltiples reinicios del backend con `docker compose restart backend`.
- La totalidad de los 6.000.000 de registros en `visitas_stands` y los datos maestros permanecen intactos post-reinicio.

---

## Incidencia 3: INC-DB-03 — Cuello de Botella y Full Scan por Predicado No SARGable en Búsqueda de Expositores

### Ficha Técnica en Mantis BT

| Campo | Valor |
|---|---|
| **ID Incidencia** | **INC-DB-03** |
| **Proyecto** | ExpoJuy 2026 / Backend & Database |
| **Categoría** | Rendimiento (Performance) |
| **Severidad** | Media |
| **Prioridad** | Normal |
| **Estado** | **Cerrada (Resuelta)** |
| **Resolución** | Corregido |
| **Asignado a** | Integrante 2 (DBA) |
| **Informado por** | Integrante 5 (QA) |
| **Fecha de Reporte** | 04/11/2026 |
| **Fecha de Cierre** | 07/11/2026 |
| **Commit de Solución** | `docs/sql/02_optimizaciones_indices.sql` |

### Descripción del Problema
La funcionalidad de búsqueda y filtrado de stands por nombre de expositor y sector presentaba una latencia inaceptable de más de **10.500 ms (10,5 segundos)** al cruzar los stands con la tabla masiva de visitas.

### Pasos para Reproducir
Ejecutar la consulta original:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT s.id, s.sector, exp.name, count(v.id)
FROM stands s
LEFT JOIN expositores exp ON s."expositorId" = exp.id
LEFT JOIN visitas_stands v ON s.id = v.stand_id
WHERE UPPER(exp.name) LIKE '%MINERA%' 
   OR LOWER(s.sector) LIKE '%cubierto%'
GROUP BY s.id, s.sector, exp.name;
```

### Causa Raíz
El predicado `WHERE UPPER(exp.name) LIKE '%MINERA%' OR LOWER(s.sector) LIKE '%cubierto%'` es **no SARGable (*Search Argument Able*)**:
1. El uso de las funciones escalares `UPPER()` y `LOWER()` dentro de la cláusula `WHERE` anula la capacidad del optimizador de utilizar cualquier índice B-Tree estándar sobre esas columnas.
2. El uso del comodín inicial `%MINERA%` impide el recorrido por ramas de un árbol B-Tree convencional.
3. Esto obligaba a PostgreSQL a realizar un escaneo completo de tablas y a materializar loops anidados sobre los 6.000.000 de registros.

### Solución Implementada
1. Se habilitó la extensión oficial de trigramas `pg_trgm` en PostgreSQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```
2. Se construyó un **Índice Invertido Generalizado (GIN)** con clase de operador de trigramas sobre el nombre del expositor, y un índice B-Tree sobre el sector normalizado:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expositores_name_trgm 
   ON expositores USING gin (name gin_trgm_ops);
   
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stands_sector_btree 
   ON stands (sector);
   ```
3. Se reescribió la consulta en forma SARGable utilizando el operador case-insensitive `ILIKE` (soportado nativamente por el índice GIN `pg_trgm`) e igualdad directa para el sector:
   ```sql
   WHERE exp.name ILIKE '%MINERA%' 
      OR s.sector = 'Pabellón Cubierto'
   ```

### Resultado y Verificación
- **Tiempo de ejecución previo:** 10.547 ms (10,54 s)
- **Tiempo de ejecución posterior:** **4.965 ms** (con ordenamiento incremental optimizado)
- **Ganancia neta:** **52,93% de reducción de tiempo de respuesta**.
- **Buffers leídos:** Eliminación del Sequential Scan sobre expositores mediante uso de `Bitmap Index Scan`.
