const { AsistenciaAgenda, Agenda, Usuario } = require('../models');

const asistenciaAgendaCtrl = {};

/**
 * Inscribe a un usuario en una actividad de la agenda
 * POST /api/asistencias-agenda
 */
asistenciaAgendaCtrl.inscribir = async (req, res) => {
  try {
    const { agenda_id, usuario_id, estado } = req.body;

    if (!agenda_id || !usuario_id) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: agenda_id y usuario_id.'
      });
    }

    const agendaExiste = await Agenda.findByPk(agenda_id);
    if (!agendaExiste) {
      return res.status(404).json({
        success: false,
        message: `La actividad de agenda con id ${agenda_id} no existe.`
      });
    }

    const usuarioExiste = await Usuario.findByPk(usuario_id);
    if (!usuarioExiste) {
      return res.status(404).json({
        success: false,
        message: `El usuario con id/legajo "${usuario_id}" no existe.`
      });
    }

    // Verificar si ya existe inscripción previa
    const inscripcionPrevia = await AsistenciaAgenda.findOne({
      where: { agenda_id, usuario_id }
    });

    if (inscripcionPrevia) {
      return res.status(409).json({
        success: false,
        data: inscripcionPrevia,
        message: 'El usuario ya se encuentra registrado para esta actividad.'
      });
    }

    const nuevaInscripcion = await AsistenciaAgenda.create({
      agenda_id: parseInt(agenda_id, 10),
      usuario_id,
      estado: estado || 'inscripto'
    });

    return res.status(201).json({
      success: true,
      data: nuevaInscripcion,
      message: 'Inscripción a la actividad completada con éxito.'
    });
  } catch (error) {
    console.error('Error al inscribir a agenda:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar asistencia a la agenda.',
      error: error.message
    });
  }
};

/**
 * Actualiza el estado de la asistencia ('inscripto', 'asistio', 'cancelo')
 * PATCH /api/asistencias-agenda/:id/estado
 */
asistenciaAgendaCtrl.actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['inscripto', 'asistio', 'cancelo'];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
      });
    }

    const registro = await AsistenciaAgenda.findByPk(id);
    if (!registro) {
      return res.status(404).json({
        success: false,
        message: `El registro de asistencia con id ${id} no existe.`
      });
    }

    registro.estado = estado;
    await registro.save();

    return res.status(200).json({
      success: true,
      data: registro,
      message: 'Estado de asistencia actualizado con éxito.'
    });
  } catch (error) {
    console.error('Error al actualizar estado de asistencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar estado.',
      error: error.message
    });
  }
};

/**
 * Obtiene las inscripciones/asistencias de un usuario
 * GET /api/asistencias-agenda/usuario/:usuarioId
 */
asistenciaAgendaCtrl.obtenerPorUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const asistencias = await AsistenciaAgenda.findAll({
      where: { usuario_id: usuarioId },
      include: [
        {
          model: Agenda,
          as: 'agenda',
          attributes: ['id', 'dia', 'horaInicio', 'horaFin', 'titulo', 'lugar', 'disertante']
        }
      ],
      order: [['fecha_registro', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: asistencias,
      message: 'Asistencias del usuario obtenidas con éxito.'
    });
  } catch (error) {
    console.error('Error al obtener asistencias por usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener asistencias del usuario.',
      error: error.message
    });
  }
};

/**
 * Obtiene los asistentes a una actividad de la agenda
 * GET /api/asistencias-agenda/agenda/:agendaId
 */
asistenciaAgendaCtrl.obtenerPorAgenda = async (req, res) => {
  try {
    const { agendaId } = req.params;

    const asistentes = await AsistenciaAgenda.findAll({
      where: { agenda_id: agendaId },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['legajo', 'nombre', 'apellido', 'correo']
        }
      ],
      order: [['fecha_registro', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: asistentes,
      message: 'Lista de asistentes obtenida con éxito.'
    });
  } catch (error) {
    console.error('Error al obtener asistentes por agenda:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener asistentes.',
      error: error.message
    });
  }
};

module.exports = asistenciaAgendaCtrl;
