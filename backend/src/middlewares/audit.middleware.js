const AuditoriaAccion = require('../models/auditoriaAccion.model');

/**
 * Middleware para registrar auditorías de acciones en la base de datos de manera automática.
 * Intercepta las solicitudes POST, PUT y DELETE exitosas.
 * @param {string} tabla - El nombre de la tabla/modelo sobre el cual se realiza la acción.
 */
const auditMiddleware = (tabla) => {
    return (req, res, next) => {
        // Solo interceptamos métodos de mutación (POST, PUT, DELETE)
        if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
            return next();
        }

        const originalJson = res.json;

        res.json = function (data) {
            // Restauramos la función original de respuesta
            res.json = originalJson;

            // Enviamos la respuesta original al cliente primero
            const response = res.json.call(this, data);

            // Solo registramos la auditoría si la operación fue exitosa (status 2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const usuarioLegajo = req.usuario ? req.usuario.legajo : (req.body ? req.body.legajo : null);

                    const method = req.method;
                    let accion = 'MODIFICAR';
                    if (method === 'POST') accion = 'CREAR';
                    if (method === 'DELETE') accion = 'ELIMINAR';

                    // Determinar el ID del registro afectado
                    let registroId = null;
                    if (req.params.id) {
                        registroId = String(req.params.id);
                    } else if (req.auditId) {
                        registroId = String(req.auditId);
                    } else if (data) {
                        // Buscar en el cuerpo de la respuesta por si el id fue retornado
                        if (data.id) {
                            registroId = String(data.id);
                        } else if (data.solicitud && data.solicitud.idSolicitud) {
                            registroId = String(data.solicitud.idSolicitud);
                        } else if (data.usuario && data.usuario.legajo) {
                            registroId = String(data.usuario.legajo);
                        }
                    }

                    // Detalles de la acción en formato JSON
                    const detalles = JSON.stringify({
                        url: req.originalUrl,
                        body: req.body,
                        status: res.statusCode
                    });

                    // Guardamos la auditoría de forma asíncrona
                    if (registroId) {
                        AuditoriaAccion.create({
                            usuarioLegajo: usuarioLegajo || null,
                            accion,
                            tabla,
                            registroId,
                            detalles
                        }).catch(err => {
                            console.error('Error al guardar registro de auditoría en la BD:', err);
                        });
                    }
                } catch (err) {
                    console.error('Error inesperado en el middleware de auditoría:', err);
                }
            }

            return response;
        };

        next();
    };
};

module.exports = auditMiddleware;
