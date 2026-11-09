const { Op, fn, col, literal } = require('sequelize');
const { VisitaStand, Stand, Expositor, Eje, Usuario } = require('../models');

const visitaStandCtrl = {};

/**
 * Registra una visita/interacción telemétrica con un stand
 * POST /api/visitas-stands
 */
visitaStandCtrl.registrarVisita = async (req, res) => {
  try {
    const {
      stand_id,
      usuario_id,
      canal,
      dispositivo,
      tiempo_permanencia_seg,
      calificacion,
      fecha_visita
    } = req.body;

    if (!stand_id || !canal || !dispositivo || tiempo_permanencia_seg === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: stand_id, canal, dispositivo y tiempo_permanencia_seg.'
      });
    }

    const canalesValidos = ['mapa_3d', 'totem_qr', 'web'];
    if (!canalesValidos.includes(canal)) {
      return res.status(400).json({
        success: false,
        message: `Canal inválido. Debe ser uno de: ${canalesValidos.join(', ')}`
      });
    }

    // Validar existencia del stand
    const standExiste = await Stand.findByPk(stand_id);
    if (!standExiste) {
      return res.status(404).json({
        success: false,
        message: `El stand con id "${stand_id}" no existe.`
      });
    }

    // Validar usuario si se proveyó
    if (usuario_id) {
      const usuarioExiste = await Usuario.findByPk(usuario_id);
      if (!usuarioExiste) {
        return res.status(404).json({
          success: false,
          message: `El usuario con id/legajo "${usuario_id}" no existe.`
        });
      }
    }

    const nuevaVisita = await VisitaStand.create({
      stand_id,
      usuario_id: usuario_id || null,
      canal,
      dispositivo,
      tiempo_permanencia_seg: parseInt(tiempo_permanencia_seg, 10),
      calificacion: calificacion !== undefined && calificacion !== null ? parseInt(calificacion, 10) : null,
      fecha_visita: fecha_visita || new Date()
    });

    return res.status(201).json({
      success: true,
      data: nuevaVisita,
      message: 'Telemetría de visita registrada exitosamente.'
    });
  } catch (error) {
    console.error('Error al registrar visita:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al registrar la visita.',
      error: error.message
    });
  }
};

/**
 * Obtiene el ranking de stands más visitados
 * GET /api/visitas-stands/ranking?limit=10&fecha_desde=...&fecha_hasta=...
 */
visitaStandCtrl.obtenerRanking = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const { fecha_desde, fecha_hasta } = req.query;

    const where = {};
    if (fecha_desde && fecha_hasta) {
      where.fecha_visita = {
        [Op.between]: [new Date(fecha_desde), new Date(fecha_hasta)]
      };
    } else if (fecha_desde) {
      where.fecha_visita = { [Op.gte]: new Date(fecha_desde) };
    } else if (fecha_hasta) {
      where.fecha_visita = { [Op.lte]: new Date(fecha_hasta) };
    }

    const ranking = await VisitaStand.findAll({
      attributes: [
        'stand_id',
        [fn('COUNT', col('VisitaStand.id')), 'total_visitas'],
        [fn('ROUND', fn('AVG', col('tiempo_permanencia_seg')), 2), 'promedio_permanencia_seg'],
        [fn('ROUND', fn('AVG', col('calificacion')), 2), 'promedio_calificacion']
      ],
      where,
      include: [
        {
          model: Stand,
          as: 'stand',
          attributes: ['id', 'sector', 'estado', 'expositorId', 'eje_id'],
          include: [
            {
              model: Expositor,
              as: 'expositor',
              attributes: ['name', 'category']
            },
            {
              model: Eje,
              as: 'eje',
              attributes: ['nombre']
            }
          ]
        }
      ],
      group: [
        'VisitaStand.stand_id',
        'stand.id',
        'stand.sector',
        'stand.estado',
        'stand.expositorId',
        'stand.eje_id',
        'stand->expositor.id',
        'stand->expositor.name',
        'stand->expositor.category',
        'stand->eje.id',
        'stand->eje.nombre'
      ],
      order: [[literal('total_visitas'), 'DESC']],
      limit
    });

    return res.status(200).json({
      success: true,
      data: ranking,
      message: 'Ranking de stands obtenido exitosamente.'
    });
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el ranking de stands.',
      error: error.message
    });
  }
};

/**
 * Obtiene métricas agregadas por Eje temático
 * GET /api/visitas-stands/metricas-eje
 */
visitaStandCtrl.obtenerMetricasPorEje = async (req, res) => {
  try {
    const metricas = await VisitaStand.findAll({
      attributes: [
        [col('stand->eje.id'), 'eje_id'],
        [col('stand->eje.nombre'), 'eje_nombre'],
        [fn('COUNT', col('VisitaStand.id')), 'total_visitas'],
        [fn('ROUND', fn('AVG', col('tiempo_permanencia_seg')), 2), 'promedio_permanencia_seg']
      ],
      include: [
        {
          model: Stand,
          as: 'stand',
          attributes: [],
          include: [
            {
              model: Eje,
              as: 'eje',
              attributes: []
            }
          ]
        }
      ],
      group: ['stand->eje.id', 'stand->eje.nombre'],
      order: [[literal('total_visitas'), 'DESC']],
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: metricas,
      message: 'Métricas por eje temático obtenidas exitosamente.'
    });
  } catch (error) {
    console.error('Error al obtener métricas por eje:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener métricas por eje.',
      error: error.message
    });
  }
};

/**
 * Obtiene agregación de visitas para mapa de calor horario y por canal
 * GET /api/visitas-stands/mapa-calor
 */
visitaStandCtrl.obtenerMapaCalor = async (req, res) => {
  try {
    const mapaCalor = await VisitaStand.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'hour', col('fecha_visita')), 'franja_horaria'],
        'canal',
        [fn('COUNT', col('id')), 'total_visitas']
      ],
      group: [literal("DATE_TRUNC('hour', fecha_visita)"), 'canal'],
      order: [[literal("DATE_TRUNC('hour', fecha_visita)"), 'ASC'], ['canal', 'ASC']],
      limit: 200,
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: mapaCalor,
      message: 'Datos de mapa de calor obtenidos con éxito.'
    });
  } catch (error) {
    console.error('Error al obtener mapa de calor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos de mapa de calor.',
      error: error.message
    });
  }
};

module.exports = visitaStandCtrl;
