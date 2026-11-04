const { rateLimit } = require('express-rate-limit');

const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

const mensajeDemasiadasSolicitudes = (ventanaMinutos) =>
    `Demasiadas solicitudes. Intentá de nuevo en ${ventanaMinutos} minutos.`;

const mensajeVentanaMinutos = (minutos) =>
    `Demasiadas consultas. Intentá de nuevo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`;

/**
 * Limiter estricto para endpoints de autenticación.
 * Objetivo: frenar ataques de fuerza bruta contra el login del panel admin.
 */
const loginLimiter = rateLimit({
    windowMs: WINDOW_MS,
    limit: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { msg: mensajeDemasiadasSolicitudes(WINDOW_MINUTES) }
});

/**
 * Limiter para endpoints públicos que disparan correos o registros masivos.
 * Objetivo: frenar spam de correo y alta masiva de registros desde una misma IP.
 */
const publicPostLimiter = rateLimit({
    windowMs: WINDOW_MS,
    limit: Number(process.env.RATE_LIMIT_PUBLIC_POST_MAX) || 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { msg: mensajeDemasiadasSolicitudes(WINDOW_MINUTES) }
});

/*Limiter para las consultas del chatbot público.*/
const chatbotLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_CHATBOT_MAX) || 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { msg: mensajeVentanaMinutos(1) }
});

module.exports = {
    loginLimiter,
    publicPostLimiter,
    chatbotLimiter,
    WINDOW_MINUTES
};
