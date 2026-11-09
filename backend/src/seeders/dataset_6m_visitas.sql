-- ============================================================================
-- SCRIPT DE CARGA MASIVA: 6.000.000+ REGISTROS EN visitas_stands
-- ExpoJuy 2026 - Integrante 2 (DBA & Data Engineer)
-- Optimizado para alto rendimiento (< 3 minutos) mediante generate_series
-- ============================================================================

\timing on

-- 1. Captura de métricas iniciales
SELECT 
    count(*) AS filas_iniciales,
    pg_size_pretty(pg_relation_size('visitas_stands')) AS tamano_tabla_antes,
    pg_size_pretty(pg_indexes_size('visitas_stands')) AS tamano_indices_antes,
    pg_size_pretty(pg_total_relation_size('visitas_stands')) AS tamano_total_antes
FROM visitas_stands;

-- 2. Inserción masiva de 6.000.000 de registros con integridad referencial real
DO $$
DECLARE
    t_inicio timestamp := clock_timestamp();
    t_fin timestamp;
    duracion_seg numeric;
    total_filas bigint;
    throughput numeric;
    stand_keys text[];
    user_keys text[];
BEGIN
    RAISE NOTICE 'Iniciando generación e inserción de 6.000.000 registros...';

    -- Cachear claves primarias reales existentes en arrays de memoria
    SELECT array_agg(id) INTO stand_keys FROM stands;
    SELECT array_agg(legajo) INTO user_keys FROM usuarios;

    IF array_length(stand_keys, 1) IS NULL THEN
        RAISE EXCEPTION 'No existen stands en la tabla stands. Ejecute el seed inicial primero.';
    END IF;

    -- Inserción directa basada en conjuntos (Set-Based Generation)
    INSERT INTO visitas_stands (
        stand_id,
        usuario_id,
        fecha_visita,
        canal,
        dispositivo,
        tiempo_permanencia_seg,
        calificacion
    )
    SELECT
        -- Stand aleatorio referencialmente íntegro
        stand_keys[1 + floor(random() * array_length(stand_keys, 1))::int],
        
        -- 25% usuarios registrados identificados, 75% visitantes anónimos
        CASE 
            WHEN random() < 0.25 AND array_length(user_keys, 1) > 0 
            THEN user_keys[1 + floor(random() * array_length(user_keys, 1))::int]
            ELSE NULL 
        END,
        
        -- Fecha dentro del rango oficial de ExpoJuy 2026 (09 al 18 de octubre de 2026)
        -- Horario de apertura ferial: 10:00 a 23:59 UTC
        TIMESTAMP '2026-10-09 10:00:00+00' 
            + (floor(random() * 10) * interval '1 day')
            + (floor(random() * 14) * interval '1 hour')
            + (floor(random() * 60) * interval '1 minute')
            + (floor(random() * 60) * interval '1 second'),
            
        -- Distribución ponderada de canales de telemetría:
        -- mapa_3d: 45%, totem_qr: 35%, web: 20%
        CASE 
            WHEN random() < 0.45 THEN 'mapa_3d'
            WHEN random() < 0.80 THEN 'totem_qr'
            ELSE 'web'
        END,
        
        -- Dispositivo utilizado por el visitante
        (ARRAY[
            'mobile_android', 
            'mobile_ios', 
            'desktop_chrome', 
            'desktop_firefox', 
            'totem_kiosk_touch'
        ])[1 + floor(random() * 5)::int],
        
        -- Tiempo de permanencia en el stand (15 a 1800 segundos)
        (15 + floor(random() * 1785))::int,
        
        -- Calificación (35% de visitantes califican de 1 a 5, 65% no califican)
        CASE 
            WHEN random() < 0.35 THEN (1 + floor(random() * 5))::int
            ELSE NULL 
        END
    FROM generate_series(1, 6000000) AS s;

    t_fin := clock_timestamp();
    duracion_seg := ROUND(EXTRACT(EPOCH FROM (t_fin - t_inicio))::numeric, 2);
    
    SELECT count(*) INTO total_filas FROM visitas_stands;
    throughput := ROUND((total_filas / NULLIF(duracion_seg, 0)), 2);

    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '¡CARGA MASIVA COMPLETADA EXITOSAMENTE!';
    RAISE NOTICE 'Total de registros insertados: %', total_filas;
    RAISE NOTICE 'Tiempo total de ejecución: % segundos (% minutos)', duracion_seg, ROUND(duracion_seg / 60.0, 2);
    RAISE NOTICE 'Throughput alcanzado: % filas/segundo', throughput;
    RAISE NOTICE '------------------------------------------------------------';
END $$;

-- 3. Métricas finales de almacenamiento en disco
SELECT 
    count(*) AS total_registros_final,
    pg_size_pretty(pg_relation_size('visitas_stands')) AS tamano_tabla_despues,
    pg_size_pretty(pg_indexes_size('visitas_stands')) AS tamano_indices_despues,
    pg_size_pretty(pg_total_relation_size('visitas_stands')) AS tamano_total_despues
FROM visitas_stands;

-- 4. Actualizar estadísticas de PostgreSQL para el optimizador de costos
ANALYZE visitas_stands;
