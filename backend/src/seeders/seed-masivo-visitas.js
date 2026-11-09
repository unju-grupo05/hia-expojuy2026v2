require('dotenv').config();
const sequelize = require('../../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Script de carga masiva de datos de telemetría (>= 6.000.000 de registros)
 * ExpoJuy 2026 - Integrante 2 (DBA)
 */
async function ejecutarCargaMasiva() {
  console.log('==============================================================');
  console.log('   EXPOJUY 2026 - PIPELINE DE CARGA MASIVA DE TELEMETRÍA');
  console.log('   Objetivo: >= 6.000.000 registros en visitas_stands');
  console.log('==============================================================');

  try {
    await sequelize.authenticate();
    console.log('Conexión con PostgreSQL validada.');

    // 1. Verificar existencia de stands maestros
    const [stands] = await sequelize.query('SELECT count(*) AS total FROM stands;');
    const totalStands = parseInt(stands[0].total, 10);
    console.log(`Stands disponibles en la base de datos: ${totalStands}`);

    if (totalStands === 0) {
      throw new Error('La tabla "stands" está vacía. Ejecute primero el seed inicial.');
    }

    // 2. Medir tamaño en disco ANTES de la carga
    const [tallasAntes] = await sequelize.query(`
      SELECT 
        count(*) AS total_filas,
        pg_relation_size('visitas_stands') AS bytes_tabla,
        pg_indexes_size('visitas_stands') AS bytes_indices,
        pg_total_relation_size('visitas_stands') AS bytes_total,
        pg_size_pretty(pg_relation_size('visitas_stands')) AS tamano_tabla,
        pg_size_pretty(pg_indexes_size('visitas_stands')) AS tamano_indices,
        pg_size_pretty(pg_total_relation_size('visitas_stands')) AS tamano_total
      FROM visitas_stands;
    `);

    console.log('\n--- MÉTRICAS ANTES DE LA CARGA ---');
    console.table(tallasAntes);

    // 3. Ejecutar la inserción masiva de 6.000.000 de registros si aún no están cargados
    const totalExistente = parseInt(tallasAntes[0].total_filas, 10);
    const tiempoInicio = Date.now();
    let duracionSeg = "0.00";
    let duracionMin = "0.00";

    if (totalExistente < 6000000) {
      const faltantes = 6000000 - totalExistente;
      console.log(`\nGenerando e insertando ${faltantes.toLocaleString()} registros en visitas_stands...`);
      console.log('Optimizando con generación en bloque (Set-Based generation)...');

      const sqlGeneracion = `
        DO $$
        DECLARE
            stand_keys text[];
            user_keys text[];
        BEGIN
            SELECT array_agg(id) INTO stand_keys FROM stands;
            SELECT array_agg(legajo) INTO user_keys FROM usuarios;

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
                stand_keys[1 + floor(random() * array_length(stand_keys, 1))::int],
                CASE 
                    WHEN random() < 0.25 AND array_length(user_keys, 1) > 0 
                    THEN user_keys[1 + floor(random() * array_length(user_keys, 1))::int]
                    ELSE NULL 
                END,
                TIMESTAMP '2026-10-09 10:00:00+00' 
                    + (floor(random() * 10) * interval '1 day')
                    + (floor(random() * 14) * interval '1 hour')
                    + (floor(random() * 60) * interval '1 minute')
                    + (floor(random() * 60) * interval '1 second'),
                CASE 
                    WHEN random() < 0.45 THEN 'mapa_3d'
                    WHEN random() < 0.80 THEN 'totem_qr'
                    ELSE 'web'
                END,
                (ARRAY[
                    'mobile_android', 
                    'mobile_ios', 
                    'desktop_chrome', 
                    'desktop_firefox', 
                    'totem_kiosk_touch'
                ])[1 + floor(random() * 5)::int],
                (15 + floor(random() * 1785))::int,
                CASE 
                    WHEN random() < 0.35 THEN (1 + floor(random() * 5))::int
                    ELSE NULL 
                END
            FROM generate_series(1, ${faltantes}) AS s;
        END $$;
      `;

      await sequelize.query(sqlGeneracion);
      const duracionMs = Date.now() - tiempoInicio;
      duracionSeg = (duracionMs / 1000).toFixed(2);
      duracionMin = (duracionMs / 60000).toFixed(2);
    } else {
      console.log(`\nLa tabla visitas_stands ya cuenta con ${totalExistente.toLocaleString()} registros (>= 6.000.000).`);
    }

    // 4. Sembrar datos complementarios para enriquecer las consultas analíticas
    console.log('\nSembrando datos auxiliares para reseñas, agenda, chatbot y auditoría...');
    
    // Reseñas de stands (10.000 reseñas)
    await sequelize.query(`
      INSERT INTO resenas_stands (stand_id, usuario_id, puntuacion, comentario, creado_en)
      SELECT 
          s.id,
          u.legajo,
          (1 + floor(random() * 5))::smallint,
          (ARRAY[
            'Excelente atención en el stand y folletería completa.',
            'Muy concurrido, pero los expositores explicaron muy bien la propuesta.',
            'Demasiada demora para ingresar al espacio interactivo.',
            'Buena iluminación y presentación institucional impecable.',
            'Falta de folletería física y muestras para el público.',
            'La demostración técnica fue de primer nivel.'
          ])[1 + floor(random() * 6)::int],
          TIMESTAMP '2026-10-09 10:00:00+00' + (random() * interval '9 days')
      FROM (SELECT id FROM stands ORDER BY random() LIMIT 100) s
      CROSS JOIN (SELECT legajo FROM usuarios LIMIT 1) u
      CROSS JOIN generate_series(1, 100) g
      ON CONFLICT DO NOTHING;
    `);

    // Asistencias a agenda (5.000 inscripciones/asistencias)
    await sequelize.query(`
      INSERT INTO asistencias_agenda (agenda_id, usuario_id, estado, fecha_registro)
      SELECT 
          a.id,
          u.legajo,
          (ARRAY['inscripto', 'asistio', 'cancelo'])[1 + floor(random() * 3)::int],
          TIMESTAMP '2026-10-01 08:00:00+00' + (random() * interval '10 days')
      FROM agenda a
      CROSS JOIN (SELECT legajo FROM usuarios LIMIT 1) u
      CROSS JOIN generate_series(1, 250) g
      LIMIT 5000;
    `);

    // Logs de chatbot (10.000 interacciones de usuarios)
    await sequelize.query(`
      INSERT INTO logs_chatbot (pregunta, respuesta, intencion, tiempo_respuesta_ms, fue_util, fecha)
      SELECT 
          (ARRAY[
            '¿Dónde queda el pabellón de litio?',
            '¿A qué hora empieza la charla de energías renovables?',
            '¿Quiénes son los expositores del sector agroindustrial?',
            '¿Cómo llegar a la Ciudad Cultural en colectivo?',
            '¿Qué empresas presentan robótica minera?'
          ])[1 + floor(random() * 5)::int],
          'Respuesta automática generada por PachAI con fichas de stands y agenda.',
          (ARRAY['busqueda_stands', 'agenda_conferencias', 'ubicacion_predio', 'faq_general', 'expositores'])[1 + floor(random() * 5)::int],
          (12 + floor(random() * 350))::int,
          CASE WHEN random() < 0.85 THEN true WHEN random() < 0.95 THEN false ELSE NULL END,
          TIMESTAMP '2026-10-09 10:00:00+00' + (random() * interval '9 days')
      FROM generate_series(1, 10000);
    `);

    // Historial de accesos concurrentes (5.000 registros para auditoría cruzada)
    await sequelize.query(`
      INSERT INTO historial_accesos (resultado, usuario_id, ip, user_agent, email_intentado, "createdAt", "updatedAt")
      SELECT 
          (ARRAY['exitoso', 'fallido'])[1 + floor(random() * 2)::int]::"enum_historial_accesos_resultado",
          u.legajo,
          ('192.168.1.' || (1 + floor(random() * 254))::text),
          'Mozilla/5.0 (ExpoJuy Mobile App / Totem Browser)',
          u.correo,
          TIMESTAMP '2026-10-09 10:00:00+00' + (random() * interval '9 days'),
          TIMESTAMP '2026-10-09 10:00:00+00' + (random() * interval '9 days')
      FROM usuarios u
      CROSS JOIN generate_series(1, 5000) g
      LIMIT 5000;
    `);

    // 5. Actualizar estadísticas del optimizador
    console.log('\nEjecutando ANALYZE sobre tablas maestras y telemetría...');
    await sequelize.query('ANALYZE visitas_stands;');
    await sequelize.query('ANALYZE resenas_stands;');
    await sequelize.query('ANALYZE asistencias_agenda;');
    await sequelize.query('ANALYZE logs_chatbot;');
    await sequelize.query('ANALYZE historial_accesos;');

    // 6. Medir tamaño en disco DESPUÉS de la carga
    const [tallasDespues] = await sequelize.query(`
      SELECT 
        count(*) AS total_filas,
        pg_relation_size('visitas_stands') AS bytes_tabla,
        pg_indexes_size('visitas_stands') AS bytes_indices,
        pg_total_relation_size('visitas_stands') AS bytes_total,
        pg_size_pretty(pg_relation_size('visitas_stands')) AS tamano_tabla,
        pg_size_pretty(pg_indexes_size('visitas_stands')) AS tamano_indices,
        pg_size_pretty(pg_total_relation_size('visitas_stands')) AS tamano_total
      FROM visitas_stands;
    `);

    const filasNuevas = parseInt(tallasDespues[0].total_filas, 10) - parseInt(tallasAntes[0].total_filas, 10);
    const throughput = (filasNuevas / parseFloat(duracionSeg)).toFixed(2);

    console.log('\n--- MÉTRICAS DESPUÉS DE LA CARGA ---');
    console.table(tallasDespues);

    console.log('\n==============================================================');
    console.log('   RESUMEN FINAL DE CARGA MASIVA');
    console.log('==============================================================');
    console.log(`Filas insertadas:       ${filasNuevas.toLocaleString()}`);
    console.log(`Total acumulado:        ${parseInt(tallasDespues[0].total_filas, 10).toLocaleString()} registros`);
    console.log(`Tiempo total:           ${duracionSeg} seg (${duracionMin} minutos)`);
    console.log(`Throughput:             ${Number(throughput).toLocaleString()} filas/segundo`);
    console.log(`Crecimiento tabla:      ${tallasAntes[0].tamano_tabla} -> ${tallasDespues[0].tamano_tabla}`);
    console.log(`Crecimiento índices:    ${tallasAntes[0].tamano_indices} -> ${tallasDespues[0].tamano_indices}`);
    console.log(`Tamaño total en disco:  ${tallasAntes[0].tamano_total} -> ${tallasDespues[0].tamano_total}`);
    console.log('==============================================================\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('Error durante la carga masiva:', error);
    process.exit(1);
  }
}

ejecutarCargaMasiva();
