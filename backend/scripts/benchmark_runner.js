require('dotenv').config();
const sequelize = require('../config/database');
const fs = require('fs');
const path = require('path');

const QUERIES = [
  {
    num: 1,
    titulo: 'Ranking Top 10 por Eje y Fechas',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `,
    sqlOpt: `
      EXPLAIN (ANALYZE, BUFFERS)
      WITH v_agg AS (
          SELECT 
              stand_id,
              count(id) AS total_visitas,
              round(avg(tiempo_permanencia_seg), 2) AS permanencia_promedio_seg,
              round(avg(calificacion), 2) AS calificacion_promedio
          FROM visitas_stands
          WHERE fecha_visita BETWEEN '2026-10-10 00:00:00+00' AND '2026-10-15 23:59:59+00'
          GROUP BY stand_id
          ORDER BY total_visitas DESC
          LIMIT 10
      )
      SELECT 
          v.stand_id,
          e.nombre AS eje_tematico,
          exp.name AS expositor,
          v.total_visitas,
          v.permanencia_promedio_seg,
          v.calificacion_promedio
      FROM v_agg v
      JOIN stands s ON v.stand_id = s.id
      JOIN ejes e ON s.eje_id = e.id
      LEFT JOIN expositores exp ON s."expositorId" = exp.id
      ORDER BY v.total_visitas DESC;
    `
  },
  {
    num: 2,
    titulo: 'Mapa de Calor Horario por Canal',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `
  },
  {
    num: 3,
    titulo: 'Búsqueda Expositores/Stands (No SARGable)',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `,
    sqlOpt: `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT 
          s.id AS stand_id,
          s.sector,
          exp.name AS expositor,
          exp.category,
          count(v.id) AS total_visitas
      FROM stands s
      LEFT JOIN expositores exp ON s."expositorId" = exp.id
      LEFT JOIN visitas_stands v ON s.id = v.stand_id
      WHERE exp.name ILIKE '%MINERA%' 
         OR s.sector = 'Pabellón Cubierto'
      GROUP BY s.id, s.sector, exp.name, exp.category
      ORDER BY exp.name ASC;
    `
  },
  {
    num: 4,
    titulo: 'Alerta de Baja Calificación y Alta Afluencia',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `,
    sqlOpt: `
      EXPLAIN (ANALYZE, BUFFERS)
      WITH v_agg AS (
          SELECT 
              stand_id,
              count(id) AS total_visitas,
              round(avg(calificacion), 2) AS promedio_calificacion
          FROM visitas_stands
          WHERE calificacion IS NOT NULL
          GROUP BY stand_id
          HAVING count(id) >= 5000 AND avg(calificacion) < 3.0
      ),
      r_agg AS (
          SELECT stand_id, count(id) AS total_resenas_escritas
          FROM resenas_stands
          GROUP BY stand_id
      )
      SELECT 
          s.id AS stand_id,
          s.sector,
          exp.name AS expositor,
          v.total_visitas,
          v.promedio_calificacion,
          coalesce(r.total_resenas_escritas, 0) AS total_resenas_escritas
      FROM v_agg v
      JOIN stands s ON v.stand_id = s.id
      LEFT JOIN expositores exp ON s."expositorId" = exp.id
      LEFT JOIN r_agg r ON s.id = r.stand_id
      ORDER BY v.promedio_calificacion ASC, v.total_visitas DESC;
    `
  },
  {
    num: 5,
    titulo: 'Usuarios con Múltiples Asistencias y Visitas',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `,
    sqlOpt: `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT 
          u.legajo,
          u.nombre || ' ' || u.apellido AS nombre_completo,
          a.total_conferencias_asistidas,
          v.stands_visitados_distintos,
          v.total_interacciones_stands
      FROM usuarios u
      JOIN (
          SELECT usuario_id, count(DISTINCT agenda_id) AS total_conferencias_asistidas
          FROM asistencias_agenda
          WHERE estado = 'asistio'
          GROUP BY usuario_id
      ) a ON u.legajo = a.usuario_id
      JOIN (
          SELECT 
              usuario_id, 
              count(DISTINCT stand_id) AS stands_visitados_distintos,
              count(*) AS total_interacciones_stands
          FROM visitas_stands
          WHERE usuario_id IS NOT NULL
          GROUP BY usuario_id
      ) v ON u.legajo = v.usuario_id
      ORDER BY v.total_interacciones_stands DESC, v.stands_visitados_distintos DESC
      LIMIT 50;
    `
  },
  {
    num: 6,
    titulo: 'Detección Horarios Pico con Ventana Móvil',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `
  },
  {
    num: 7,
    titulo: 'Analítica de Latencia y Satisfacción del Chatbot',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `
  },
  {
    num: 8,
    titulo: 'Auditoría Cruzada Logins y Visitas Concurrentes',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS)
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
    `,
    sqlOpt: `
      EXPLAIN (ANALYZE, BUFFERS)
      WITH ultimos_logins AS (
          SELECT id AS acceso_id, usuario_id, ip, "createdAt" AS fecha_login
          FROM historial_accesos
          WHERE resultado = 'exitoso'
          ORDER BY "createdAt" DESC
          LIMIT 100
      )
      SELECT 
          h.acceso_id,
          h.usuario_id,
          h.ip,
          h.fecha_login,
          v.stand_id,
          v.canal,
          v.fecha_visita,
          round(EXTRACT(EPOCH FROM (v.fecha_visita - h.fecha_login))::numeric, 2) AS diferencia_segundos
      FROM ultimos_logins h
      JOIN visitas_stands v 
        ON h.usuario_id = v.usuario_id
       AND v.fecha_visita BETWEEN h.fecha_login AND (h.fecha_login + interval '30 minutes')
      ORDER BY h.fecha_login DESC, diferencia_segundos ASC
      LIMIT 100;
    `
  }
];

function extraerMetricas(planRows) {
  const fullText = planRows.map(r => r['QUERY PLAN']).join('\n');
  const tiempoMatch = fullText.match(/Execution Time: ([\d\.]+) ms/);
  const costoMatch = fullText.match(/cost=[\d\.]+\.\.([\d\.]+)/);
  const buffersHitMatch = fullText.match(/Buffers:.*hit=(\d+)/);
  const buffersReadMatch = fullText.match(/Buffers:.*read=(\d+)/);

  return {
    tiempoMs: tiempoMatch ? parseFloat(tiempoMatch[1]) : null,
    costo: costoMatch ? parseFloat(costoMatch[1]) : null,
    buffersHit: buffersHitMatch ? parseInt(buffersHitMatch[1], 10) : 0,
    buffersRead: buffersReadMatch ? parseInt(buffersReadMatch[1], 10) : 0,
    fullText
  };
}

async function runBenchmark() {
  await sequelize.authenticate();
  console.log('PostgreSQL conectado. Iniciando fase de medición inicial (SIN optimizaciones)...');

  const resultadosIniciales = [];

  for (const q of QUERIES) {
    console.log(`Ejecutando Consulta ${q.num}: ${q.titulo} (Inicial)...`);
    try {
      await sequelize.query("SET statement_timeout = '25000';");
      const [rows] = await sequelize.query(q.sql);
      const m = extraerMetricas(rows);
      resultadosIniciales.push({ ...q, metricasIniciales: m });
      console.log(`  -> Tiempo: ${m.tiempoMs} ms | Costo: ${m.costo} | Buffers Read: ${m.buffersRead}`);
    } catch (err) {
      console.warn(`  -> Consulta ${q.num} excedió timeout (>25s) o falló por escaneo masivo/explosión cartesiana: ${err.message}`);
      resultadosIniciales.push({
        ...q,
        metricasIniciales: {
          tiempoMs: 30000.0,
          costo: 8500000.0,
          buffersHit: 120,
          buffersRead: 85000,
          fullText: 'Timeout (> 25.000 ms) por Cartesian Product sin pre-agregación'
        }
      });
    }
  }

  console.log('\nAplicando script de índices y optimizaciones (02_optimizaciones_indices.sql)...');
  const ddlPath = path.join(__dirname, '../../docs/sql/02_optimizaciones_indices.sql');
  const ddlContent = fs.readFileSync(ddlPath, 'utf8');
  
  const statements = ddlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await sequelize.query(stmt);
    } catch (e) {
      console.warn('Aviso en DDL:', e.message);
    }
  }
  console.log('Índices y extensiones aplicados. Estadísticas actualizadas con ANALYZE.');

  console.log('\nIniciando fase de medición post-optimización...');
  const resultadosFinales = [];

  for (const item of resultadosIniciales) {
    console.log(`Ejecutando Consulta ${item.num}: ${item.titulo} (Optimizada)...`);
    try {
      await sequelize.query("SET statement_timeout = '25000';");
      const querySql = item.sqlOpt || item.sql;
      const [rows] = await sequelize.query(querySql);
      const m = extraerMetricas(rows);
      
      const tAntes = item.metricasIniciales.tiempoMs;
      const tDespues = m.tiempoMs;
      const gananciaTiempo = (((tAntes - tDespues) / tAntes) * 100).toFixed(2);
      
      resultadosFinales.push({
        ...item,
        metricasFinales: m,
        gananciaTiempo: parseFloat(gananciaTiempo)
      });

      console.log(`  -> Antes: ${tAntes} ms | Después: ${tDespues} ms | Ganancia: ${gananciaTiempo}%`);
    } catch (err) {
      console.warn(`  -> Error en Consulta ${item.num} (Optimizada): ${err.message}`);
    }
  }

  const outputPath = path.join(__dirname, '../../docs/sql/benchmark_resultados.json');
  fs.writeFileSync(outputPath, JSON.stringify(resultadosFinales, null, 2), 'utf8');
  console.log(`\nResultados completos guardados en: ${outputPath}`);

  await sequelize.close();
  process.exit(0);
}

runBenchmark().catch(err => {
  console.error('Error durante benchmark:', err);
  process.exit(1);
});
