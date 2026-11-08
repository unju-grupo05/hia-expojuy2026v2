-- ============================================================================
-- TRABAJO INTEGRADOR EXPOJUY 2026 - INTEGRANTE 2 (DBA)
-- CAPÍTULO 7 / PUNTO 5: 8 CONSULTAS COMPLEJAS DE NEGOCIO PARA BENCHMARK
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONSULTA 1: Ranking Top 10 stands con mayor concurrencia y tiempo de
-- permanencia por Eje temático en un rango de fechas oficial.
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT 
    s.id AS stand_id,
    e.nombre AS eje_tematico,
    exp.name AS expositor,
    count(v.id) AS total_visitas,
    round(avg(v.tiempo_permanencia_seg), 2) AS permanencia_promedio_seg,
    round(avg(v.calificacion), 2) AS calificacion_promedio
FROM visitas_stands v
JOIN stands s ON v.stand_id = s.id
JOIN ejes e ON s.eje_id = e.id
LEFT JOIN expositores exp ON s."expositorId" = exp.id
WHERE v.fecha_visita BETWEEN '2026-10-10 00:00:00+00' AND '2026-10-15 23:59:59+00'
GROUP BY s.id, e.nombre, exp.name
ORDER BY total_visitas DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- CONSULTA 2: Agregación horaria de visitas por canal ('mapa_3d' vs 'totem_qr')
-- para construcción de mapa de calor ferial.
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT 
    date_trunc('hour', v.fecha_visita) AS franja_horaria,
    count(*) FILTER (WHERE v.canal = 'mapa_3d') AS visitas_mapa_3d,
    count(*) FILTER (WHERE v.canal = 'totem_qr') AS visitas_totem_qr,
    count(*) FILTER (WHERE v.canal = 'web') AS visitas_web,
    count(*) AS total_visitas_hora,
    round(avg(v.tiempo_permanencia_seg), 2) AS permanencia_media_seg
FROM visitas_stands v
WHERE v.fecha_visita BETWEEN '2026-10-09 10:00:00+00' AND '2026-10-18 23:59:59+00'
GROUP BY date_trunc('hour', v.fecha_visita)
ORDER BY franja_horaria ASC;

-- ----------------------------------------------------------------------------
-- CONSULTA 3: Búsqueda de expositores y stands con filtros combinados y
-- predicado no SARGable original (uso de funciones en WHERE / ILIKE).
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT 
    s.id AS stand_id,
    s.sector,
    exp.name AS expositor,
    exp.category,
    count(v.id) AS total_visitas
FROM stands s
LEFT JOIN expositores exp ON s."expositorId" = exp.id
LEFT JOIN visitas_stands v ON s.id = v.stand_id
WHERE UPPER(exp.name) LIKE '%MINERA%' 
   OR LOWER(s.sector) LIKE '%cubierto%'
GROUP BY s.id, s.sector, exp.name, exp.category
ORDER BY UPPER(exp.name) ASC;

-- ----------------------------------------------------------------------------
-- CONSULTA 4: Reporte de stands con peor promedio de calificación y más de
-- N visitas registradas (auditoría de calidad y satisfacción).
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT 
    s.id AS stand_id,
    s.sector,
    exp.name AS expositor,
    count(v.id) AS total_visitas,
    round(avg(v.calificacion), 2) AS promedio_calificacion,
    count(r.id) AS total_resenas_escritas
FROM stands s
JOIN visitas_stands v ON s.id = v.stand_id
LEFT JOIN expositores exp ON s."expositorId" = exp.id
LEFT JOIN resenas_stands r ON s.id = r.stand_id
WHERE v.calificacion IS NOT NULL
GROUP BY s.id, s.sector, exp.name
HAVING count(v.id) >= 5000 AND avg(v.calificacion) < 3.0
ORDER BY promedio_calificacion ASC, total_visitas DESC;

-- ----------------------------------------------------------------------------
-- CONSULTA 5: Listado de usuarios con múltiples asistencias a conferencias
-- y visitas a stands feriales asociados.
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT 
    u.legajo,
    u.nombre || ' ' || u.apellido AS nombre_completo,
    count(DISTINCT a.agenda_id) AS total_conferencias_asistidas,
    count(DISTINCT v.stand_id) AS stands_visitados_distintos,
    count(v.id) AS total_interacciones_stands
FROM usuarios u
JOIN asistencias_agenda a ON u.legajo = a.usuario_id AND a.estado = 'asistio'
JOIN visitas_stands v ON u.legajo = v.usuario_id
GROUP BY u.legajo, u.nombre, u.apellido
HAVING count(DISTINCT a.agenda_id) >= 1
ORDER BY total_interacciones_stands DESC, stands_visitados_distintos DESC
LIMIT 50;

-- ----------------------------------------------------------------------------
-- CONSULTA 6: Detección de horarios pico de afluencia por stand mediante
-- ventana móvil analítica (OVER PARTITION BY).
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
WITH afluencia_horaria AS (
    SELECT 
        stand_id,
        date_trunc('hour', fecha_visita) AS hora_visita,
        count(*) AS afluencia
    FROM visitas_stands
    WHERE fecha_visita BETWEEN '2026-10-10 10:00:00+00' AND '2026-10-12 22:00:00+00'
    GROUP BY stand_id, date_trunc('hour', fecha_visita)
)
SELECT 
    stand_id,
    hora_visita,
    afluencia,
    round(avg(afluencia) OVER (
        PARTITION BY stand_id 
        ORDER BY hora_visita 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS media_movil_3h,
    rank() OVER (
        PARTITION BY stand_id 
        ORDER BY afluencia DESC
    ) AS ranking_pico
FROM afluencia_horaria
ORDER BY afluencia DESC
LIMIT 100;

-- ----------------------------------------------------------------------------
-- CONSULTA 7: Consulta analítica de rendimiento del chatbot cruzando latencias,
-- percentiles (P95) y tasa de respuestas útiles por intención.
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT 
    coalesce(intencion, 'sin_clasificar') AS intencion,
    count(*) AS total_consultas,
    round(avg(tiempo_respuesta_ms), 2) AS latencia_promedio_ms,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY tiempo_respuesta_ms) AS mediana_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY tiempo_respuesta_ms) AS p95_latencia_ms,
    count(*) FILTER (WHERE fue_util = true) AS respuestas_utiles,
    count(*) FILTER (WHERE fue_util = false) AS respuestas_no_utiles,
    round(
        (count(*) FILTER (WHERE fue_util = true)::numeric / 
         NULLIF(count(*) FILTER (WHERE fue_util IS NOT NULL), 0)::numeric) * 100, 
        2
    ) AS porcentaje_satisfaccion
FROM logs_chatbot
GROUP BY coalesce(intencion, 'sin_clasificar')
ORDER BY total_consultas DESC;

-- ----------------------------------------------------------------------------
-- CONSULTA 8: Consulta de auditoría y accesos concurrentes vinculando
-- historial_accesos con visitas_stands en ventana temporal inmediata.
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, TIMING, COSTS)
SELECT 
    h.id AS acceso_id,
    h.usuario_id,
    h.ip,
    h."createdAt" AS fecha_login,
    v.stand_id,
    v.canal,
    v.fecha_visita,
    round(EXTRACT(EPOCH FROM (v.fecha_visita - h."createdAt"))::numeric, 2) AS diferencia_segundos
FROM historial_accesos h
JOIN visitas_stands v 
  ON h.usuario_id = v.usuario_id
 AND v.fecha_visita BETWEEN h."createdAt" AND (h."createdAt" + interval '30 minutes')
WHERE h.resultado = 'exitoso'
ORDER BY h."createdAt" DESC, diferencia_segundos ASC
LIMIT 100;
