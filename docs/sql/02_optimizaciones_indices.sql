-- ============================================================================
-- TRABAJO INTEGRADOR EXPOJUY 2026 - INTEGRANTE 2 (DBA)
-- CAPÍTULO 7 / PUNTO 5: DDL DE ÍNDICES Y OPTIMIZACIONES JUSTIFICADAS
-- ============================================================================

-- 0. Habilitar extensiones requeridas para optimización
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- OPTIMIZACIÓN 1 (Para Consulta 1 y Consulta 2):
-- Índice B-Tree de Cobertura (Covering Index) con INCLUDE sobre fecha_visita y stand_id.
-- Permite acceso directo a columnas de agregación (tiempo_permanencia_seg, calificacion)
-- evitando lecturas de páginas de heap (Index-Only Scan).
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_fecha_stand_cov
ON visitas_stands (fecha_visita, stand_id)
INCLUDE (tiempo_permanencia_seg, calificacion, canal);

-- ----------------------------------------------------------------------------
-- OPTIMIZACIÓN 2 (Para Consulta 3):
-- Índice Invertido Generalizado (GIN) con operador de trigramas sobre expositores(name)
-- e índice B-Tree sobre sector. Convierte predicados no SARGables en búsquedas indexadas.
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expositores_name_trgm
ON expositores USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stands_sector_btree
ON stands (sector);

-- ----------------------------------------------------------------------------
-- OPTIMIZACIÓN 3 (Para Consulta 4):
-- Índice Parcial filtrado (Partial Index): solo indiza filas donde calificacion IS NOT NULL.
-- Reduce el tamaño del índice en un 65% y acelera drásticamente la evaluación del HAVING.
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_calif_parcial
ON visitas_stands (stand_id, calificacion)
WHERE calificacion IS NOT NULL;

-- ----------------------------------------------------------------------------
-- OPTIMIZACIÓN 4 (Para Consulta 5):
-- Índice compuesto parcial en asistencias_agenda e índice en visitas_stands
-- para usuarios autenticados (omitiendo el 75% de visitas anónimas).
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asistencias_usuario_asistio
ON asistencias_agenda (usuario_id, agenda_id)
WHERE estado = 'asistio';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_usuario_stand
ON visitas_stands (usuario_id, stand_id)
WHERE usuario_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- OPTIMIZACIÓN 5 (Para Consulta 6):
-- Índice compuesto B-Tree sobre (stand_id, fecha_visita) para optimizar
-- la partición analítica de ventana y ordenamiento temporal.
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_stand_fecha_compuesto
ON visitas_stands (stand_id, fecha_visita);

-- ----------------------------------------------------------------------------
-- OPTIMIZACIÓN 6 (Para Consulta 7):
-- Índice de cobertura en logs_chatbot para resolver percentiles y satisfacción.
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_chatbot_intencion_latencia
ON logs_chatbot (intencion, tiempo_respuesta_ms)
INCLUDE (fue_util);

-- ----------------------------------------------------------------------------
-- OPTIMIZACIÓN 7 (Para Consulta 8):
-- Índice compuesto parcial en historial_accesos para logins exitosos,
-- e índice compuesto parcial (usuario_id, fecha_visita) en visitas_stands
-- para correlación instantánea en ventanas de 30 minutos.
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historial_exitoso_fecha
ON historial_accesos (usuario_id, "createdAt")
WHERE resultado = 'exitoso';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitas_usuario_fecha
ON visitas_stands (usuario_id, fecha_visita)
WHERE usuario_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Actualizar catálogo del optimizador con las nuevas estadísticas
-- ----------------------------------------------------------------------------
ANALYZE visitas_stands;
ANALYZE stands;
ANALYZE expositores;
ANALYZE asistencias_agenda;
ANALYZE logs_chatbot;
ANALYZE historial_accesos;
