const cron = require('node-cron');
const Correo = require('../models/correo.model.js');
const Agenda = require('../models/agenda.model.js');
const { enviarEmailReminder } = require('./email.service.js');

// Función auxiliar para formatear una fecha al estilo "DD Mes AAAA" (ej. 09 Oct 2026)
const formatearFechaExpo = (fecha) => {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const mes = meses[fecha.getMonth()]; 
    const anio = fecha.getFullYear();
    
    return `${dia} ${mes} ${anio}`;
};

const CRON_SCHEDULE_REMINDER = process.env.CRON_SCHEDULE_REMINDER || '0 5 * * *';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/+$/, '');

const iniciarCronRecordatorios = () => {
    cron.schedule(CRON_SCHEDULE_REMINDER, async () => {
        try {
            const hoy = new Date();
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);
            const fechaMananaTexto = formatearFechaExpo(manana);
            const avisosPendientes = await Correo.findAll({
                where: {
                    tipo: 'recordatorio',
                    estado: 'pendiente'
                },
                include: [{
                    model: Agenda,
                    as: 'actividad',
                    where: { diaSemana: fechaMananaTexto }
                }]
            });

            if (avisosPendientes.length === 0) return;

            for (const registro of avisosPendientes) {
                const charla = registro.actividad;

                const html = `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Recordatorio ExpoJuy 2026</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 30px 10px;">
                            <tr>
                                <td align="center">
                                    <!-- Contenedor Principal -->
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                                        
                                        <!-- Header con Banner Oscuro -->
                                        <tr>
                                            <td style="background-color: #17131f; padding: 32px 30px; text-align: center; border-bottom: 3px solid #00c2d1;">
                                                <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #00c2d1; margin-bottom: 8px;">
                                                    Agenda Oficial · ExpoJuy 2026
                                                </span>
                                                <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.2;">
                                                    ¡Tu actividad es mañana!
                                                </h1>
                                            </td>
                                        </tr>

                                        <!-- Cierre Header / Saludo -->
                                        <tr>
                                            <td style="padding: 30px 30px 10px 30px;">
                                                <p style="margin: 0 0 12px 0; font-size: 16px; color: #334155; line-height: 1.5;">
                                                    Hola <strong style="color: #17131f;">${registro.nombre || 'Visitante'}</strong>,
                                                </p>
                                                <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">
                                                    Te recordamos que estás suscrito a la siguiente conferencia en nuestro programa oficial:
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Card de la Actividad -->
                                        <tr>
                                            <td style="padding: 10px 30px 25px 30px;">
                                                <div style="background-color: #f4f0fa; border-left: 4px solid #320c64; border-radius: 16px; padding: 24px;">
                                                    <h2 style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #320c64; line-height: 1.4;">
                                                        ${charla.titulo}
                                                    </h2>

                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="padding: 4px 0; font-size: 14px; color: #475569;">
                                                                <strong style="color: #17131f;">⏰ Horario:</strong> ${charla.horaInicio} - ${charla.horaFin} hs
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 4px 0; font-size: 14px; color: #475569;">
                                                                <strong style="color: #17131f;">📍 Escenario / Lugar:</strong> ${charla.lugar || 'Predio Ferial Ciudad Cultural'}
                                                            </td>
                                                        </tr>
                                                        ${charla.disertante ? `
                                                        <tr>
                                                            <td style="padding: 4px 0; font-size: 14px; color: #475569;">
                                                                <strong style="color: #17131f;">🗣️ Disertante:</strong> ${charla.disertante}
                                                            </td>
                                                        </tr>` : ''}
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>

                                        <!-- Botón de Acción Directa -->
                                        <tr>
                                            <td align="center" style="padding: 0 30px 30px 30px;">
                                                <a href="${FRONTEND_URL}/#agenda" target="_blank" style="display: inline-block; background-color: #17131f; color: #ffffff; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; padding: 14px 28px; border-radius: 50px; box-shadow: 0 4px 12px rgba(23, 19, 31, 0.25);">
                                                    Ver Cronograma Completo
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #475569;">
                                                    ExpoJuy 2026 · Feria Internacional de Jujuy
                                                </p>
                                                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                                    Predio Ferial Ciudad Cultural · San Salvador de Jujuy
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `;

                await enviarEmailReminder(registro.email, `[Mañana] Recordatorio: ${charla.titulo}`, html);

                registro.estado = 'enviado';
                await registro.save();
                console.log(`[OK] Recordatorio enviado a ${registro.email}`);
            }

        } catch (error) {
            console.error('Error en el Cron Job de recordatorios:', error);
        }
    });
};

module.exports = iniciarCronRecordatorios;