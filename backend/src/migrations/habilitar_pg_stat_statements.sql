-- ============================================================================
-- Migración: Habilitar pg_stat_statements y pgvector
-- ExpoJuy 2026 - Integrante 2 (DBA)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verificar instalación
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_stat_statements', 'vector', 'pg_trgm');
