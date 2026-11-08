const { fn, col } = require('sequelize');
const { ResenaStand, Stand, Usuario } = require('../models');

const resenaStandCtrl = {};

/**
 * Crea una nueva reseña y calificación para un stand
 * POST /api/resenas-stands
 */
resenaStandCtrl.crearResena = async (req, res) => {
  try {
    const { stand_id, usuario_id, puntuacion, comentario } = req.body;

    if (!stand_id || !usuario_id || puntuacion === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: stand_id, usuario_id y puntuacion.'
      });
    }

    const punt = parseInt(puntuacion, 10);
    if (isNaN(punt) || punt < 1 || punt > 5) {
      return res.status(400).json({
        success: false,
        message: 'La puntuación debe ser un número entero entre 1 y 5.'
      });
    }

    const standExiste = await Stand.findByPk(stand_id);
    if (!standExiste) {
      return res.status(404).json({
        success: false,
        message: `El stand con id "${stand_id}" no existe.`
      });
    }

    const usuarioExiste = await Usuario.findByPk(usuario_id);
    if (!usuarioExiste) {
      return res.status(404).json({
        success: false,
        message: `El usuario con id/legajo "${usuario_id}" no existe.`
      });
    }

    const nuevaResena = await ResenaStand.create({
      stand_id,
      usuario_id,
      puntuacion: punt,
      comentario: comentario ? comentario.trim() : null
    });

    return res.status(201).json({
      success: true,
      data: nuevaResena,
      message: 'Reseña registrada con éxito.'
    });
  } catch (error) {
    console.error('Error al crear reseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la reseña.',
      error: error.message
    });
  }
};

/**
 * Obtiene reseñas y calificación promedio de un stand
 * GET /api/resenas-stands/stand/:standId
 */
resenaStandCtrl.obtenerResenasPorStand = async (req, res) => {
  try {
    const { standId } = req.params;

    const resenas = await ResenaStand.findAll({
      where: { stand_id: standId },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['legajo', 'nombre', 'apellido', 'correo']
        }
      ],
      order: [['creado_en', 'DESC']]
    });

    const metricas = await ResenaStand.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_resenas'],
        [fn('ROUND', fn('AVG', col('puntuacion')), 2), 'promedio_puntuacion']
      ],
      where: { stand_id: standId },
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: {
        stand_id: standId,
        resumen: metricas,
        resenas
      },
      message: 'Reseñas obtenidas con éxito.'
    });
  } catch (error) {
    console.error('Error al obtener reseñas de stand:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reseñas.',
      error: error.message
    });
  }
};

/**
 * Obtiene reseñas emitidas por un usuario
 * GET /api/resenas-stands/usuario/:usuarioId
 */
resenaStandCtrl.obtenerResenasPorUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const resenas = await ResenaStand.findAll({
      where: { usuario_id: usuarioId },
      include: [
        {
          model: Stand,
          as: 'stand',
          attributes: ['id', 'sector', 'estado']
        }
      ],
      order: [['creado_en', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: resenas,
      message: 'Reseñas del usuario obtenidas con éxito.'
    });
  } catch (error) {
    console.error('Error al obtener reseñas de usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reseñas del usuario.',
      error: error.message
    });
  }
};

module.exports = resenaStandCtrl;
