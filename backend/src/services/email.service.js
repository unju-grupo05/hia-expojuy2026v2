const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const enviarEmailReminder = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"ExpoJuy 2026" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        };

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error enviando email:', error);
        throw error;
    }
};

/**
 * Escapa los cinco caracteres que rompen el contexto HTML de las plantillas de
 * correo. Se aplica a todo dato Proveniente del usuario antes de interpolarlo.
 */
const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

const enviarEmailB2BExpositor = async (to, solicitud) => {
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b;padding:24px">
                <main style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
                    <header style="background:#17131f;color:#fff;padding:28px 24px">
                        <p style="margin:0 0 8px;color:#00c2d1;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">ExpoJuy 2026 · Reuniones B2B</p>
                        <h1 style="margin:0;font-size:22px">Nueva solicitud de reunión B2B</h1>
                    </header>
                    <section style="padding:24px;line-height:1.6;font-size:14px">
                        <p>Se registró una nueva solicitud para <strong>${escapeHtml(solicitud.empresaExpositora)}</strong>.</p>
                        <p><strong>Cliente:</strong> ${escapeHtml(solicitud.nombreCliente)}<br>
                            <strong>Empresa:</strong> ${escapeHtml(solicitud.empresaCliente)}<br>
                            <strong>Correo:</strong> ${escapeHtml(solicitud.emailCliente)}<br>
                            <strong>Teléfono:</strong> ${escapeHtml(solicitud.telefonoCliente)}</p>
                        <p><strong>Fecha preferida:</strong> ${escapeHtml(solicitud.fechaSolicitada)}<br>
                            <strong>Horario preferido:</strong> ${escapeHtml(solicitud.horaInicioSolicitada)} - ${escapeHtml(solicitud.horaFinSolicitada)}<br>
                            <strong>Asistentes:</strong> ${escapeHtml(solicitud.cantidadAsistentes)}<br>
                            <strong>Modalidad:</strong> ${escapeHtml(solicitud.modalidad)}</p>
                        <p><strong>Motivo:</strong> ${escapeHtml(solicitud.motivo)}<br>
                            <strong>Observaciones:</strong> ${escapeHtml(solicitud.observaciones || 'Sin observaciones')}</p>
                        <p style="padding:14px;background:#fef3c7;border-radius:10px"><strong>Importante:</strong> el horario indicado es una preferencia del cliente, no una confirmación. Por favor, comunícate con el cliente para confirmar la reunión o coordinar otro horario.</p>
                    </section>
                </main>
            </body>
            </html>`;

        return enviarEmailReminder(to, 'Nueva solicitud de reunión B2B - ExpoJuy 2026', html);
};

module.exports = { enviarEmailReminder, enviarEmailB2BExpositor, escapeHtml };