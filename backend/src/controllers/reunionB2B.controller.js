const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const ReunionB2B = require('../models/reunionB2B.model');
const Expositor = require('../models/expositor.model');
const { enviarEmailB2BExpositor } = require('../services/email.service');

const MAX_TEXT_LENGTH = 5000;

function todayInArgentina() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: process.env.APP_TIMEZONE || 'America/Argentina/Jujuy',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}


function normalizeTime(value) {
    const raw = String(value || '');
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) return null;

    const [horas, minutos, segundos = '0'] = raw.split(':').map(Number);
    if (horas > 23 || minutos > 59 || segundos > 59) return null;

    return raw.length === 5 ? `${raw}:00` : raw;
}

function validateRequest(data) {
    const required = [
        'nombreCliente', 'empresaCliente', 'emailCliente', 'telefonoCliente',
        'empresaExpositora', 'fechaSolicitada', 'horaInicioSolicitada',
        'horaFinSolicitada', 'cantidadAsistentes', 'motivo', 'modalidad'
    ];
    const missing = required.filter(field => data[field] === undefined || data[field] === null || String(data[field]).trim() === '');
    if (missing.length) return `Faltan campos obligatorios: ${missing.join(', ')}.`;
    if (String(data.nombreCliente).length > 160 || String(data.empresaCliente).length > 180 || String(data.empresaExpositora).length > 180 || String(data.telefonoCliente).length > 40) return 'Uno de los datos de contacto supera la longitud permitida.';
    if (String(data.motivo).length > MAX_TEXT_LENGTH || String(data.observaciones || '').length > MAX_TEXT_LENGTH) return 'El motivo u observaciones superan la longitud permitida.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailCliente)) return 'El correo electrónico no tiene un formato válido.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fechaSolicitada) || data.fechaSolicitada < todayInArgentina()) return 'La fecha solicitada no puede ser anterior al día actual.';

    const start = normalizeTime(data.horaInicioSolicitada);
    const end = normalizeTime(data.horaFinSolicitada);
    if (!start || !end) return 'Las horas solicitadas deben tener formato HH:mm.';
    if (end <= start) return 'La hora de finalización debe ser posterior a la hora de inicio.';
    if (!Number.isInteger(Number(data.cantidadAsistentes)) || Number(data.cantidadAsistentes) < 1 || Number(data.cantidadAsistentes) > 999) return 'La cantidad de asistentes debe ser un entero entre 1 y 999.';
    if (!['presencial', 'virtual'].includes(data.modalidad)) return 'La modalidad debe ser presencial o virtual.';
    return null;
}

/** Normaliza el body received a los tipos que espera el modelo. */
function sanitizePayload(body) {
    return {
        nombreCliente: String(body.nombreCliente || '').trim(),
        empresaCliente: String(body.empresaCliente || '').trim(),
        emailCliente: String(body.emailCliente || '').trim().toLowerCase(),
        telefonoCliente: String(body.telefonoCliente || '').trim(),
        empresaExpositora: String(body.empresaExpositora || '').trim(),
        expositorId: body.expositorId ? String(body.expositorId) : null,
        fechaSolicitada: body.fechaSolicitada,
        horaInicioSolicitada: body.horaInicioSolicitada,
        horaFinSolicitada: body.horaFinSolicitada,
        cantidadAsistentes: Number(body.cantidadAsistentes),
        motivo: String(body.motivo || '').trim(),
        modalidad: body.modalidad,
        observaciones: body.observaciones ? String(body.observaciones).trim() : null
    };
}

const reunionB2BCtrl = {};

reunionB2BCtrl.crear = async (req, res) => {
    const data = sanitizePayload(req.body);
    const validationError = validateRequest(data);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const transaction = await sequelize.transaction();
    try {
        let expositor = null;
        if (data.expositorId || data.empresaExpositora) {
            expositor = data.expositorId
                ? await Expositor.findByPk(data.expositorId, { transaction })
                : await Expositor.findOne({ where: { name: { [Op.iLike]: data.empresaExpositora } }, transaction });
            if (!expositor) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'El expositor seleccionado no existe.' });
            }
            data.empresaExpositora = expositor.name;
            data.expositorId = expositor.id;
        }

        const solicitud = await ReunionB2B.create({
            ...data,
            horaInicioSolicitada: normalizeTime(data.horaInicioSolicitada),
            horaFinSolicitada: normalizeTime(data.horaFinSolicitada),
            estado: 'pendiente',
            emailExpositorEnviado: false
        }, { transaction });
        await transaction.commit();

        let emailEnviado = false;
        let emailError = null;
        if (expositor?.email) {
            try {
                await enviarEmailB2BExpositor(expositor.email, solicitud);
                emailEnviado = true;
                await solicitud.update({ emailExpositorEnviado: true });
            } catch (error) {
                emailError = 'La solicitud se guardó, pero no se pudo enviar la notificación al expositor.';
                console.error('Error enviando notificación B2B al expositor:', error.message);
            }
        } else {
            emailError = 'La solicitud se guardó, pero el expositor no tiene un correo configurado.';
            console.warn(`Solicitud B2B ${solicitud.id} guardada sin correo de expositor.`);
        }

        return res.status(201).json({
            success: true,
            data: { id: solicitud.id },
            emailEnviado,
            message: emailError || 'La solicitud B2B fue registrada correctamente.'
        });
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        console.error('Error al registrar solicitud B2B:', error.message);
        return res.status(500).json({ success: false, message: 'No se pudo registrar la solicitud B2B.' });
    }
};

module.exports = reunionB2BCtrl;
module.exports.validateRequest = validateRequest;
module.exports.sanitizePayload = sanitizePayload;
module.exports.normalizeTime = normalizeTime;
