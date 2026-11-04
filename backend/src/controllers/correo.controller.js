const Correo = require('../models/correo.model.js');
const Agenda = require('../models/agenda.model.js');

const correoCtrl = {};

correoCtrl.enviarCorreo = async (req, res) => {
    try {
        const { email, actividadId, tipo, nombre } = req.body;
        if (!email || !email.trim()) {
            return res.status(400).json({ 
                success: false, 
                data: null, 
                message: 'El correo electrónico es obligatorio.' 
            });
        }

        let eventoEncontrado = null;

        if (actividadId) {
            eventoEncontrado = await Agenda.findByPk(actividadId);
            if (!eventoEncontrado) {
                return res.status(404).json({ 
                    success: false, 
                    data: null, 
                    message: `La actividad con ID ${actividadId} no existe en la agenda.` 
                });
            }

            const suscripcionExistente = await Correo.findOne({
                where: {
                    email: email.trim(),
                    actividadId: actividadId,
                    estado: 'pendiente'
                }
            });

            if (suscripcionExistente) {
                return res.status(200).json({
                    success: true,
                    data: suscripcionExistente,
                    message: 'Ya estás suscrito a los recordatorios de esta actividad.'
                });
            }
        }

        const nuevoCorreo = await Correo.create({
            email: email.trim(),
            actividadId: actividadId ? Number(actividadId) : null,
            tipo: tipo || (actividadId ? 'recordatorio' : 'contacto'),
            nombre: nombre || 'Visitante',
            asunto: eventoEncontrado ? `Recordatorio: ${eventoEncontrado.titulo}` : 'Contacto ExpoJuy 2026',
            mensaje: req.body.mensaje || null,
            empresa: req.body.empresa || null,
            perfil: req.body.perfil || null,
            estado: 'pendiente'
        });

        return res.status(201).json({ 
            success: true, 
            data: nuevoCorreo, 
            message: actividadId 
                ? '¡Te registraste correctamente! Te avisaremos por correo 24 horas antes.' 
                : 'Mensaje de contacto enviado con éxito.' 
        });

    } catch (error) {
        console.error('Error definitivo en correoCtrl.enviarCorreo:', error);
        return res.status(500).json({ 
            success: false, 
            data: null, 
            message: 'Error interno del servidor al procesar el correo.',
            detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = correoCtrl;