const {
    sanitizarEntrada,
    extraerPalabrasClave,
    detectarIntencion,
    detectarSeccion,
    construirFicha,
    buscarEnBase
} = require('../services/chatbot-search.service');

const chatbotCtrl = {};


const RESPUESTAS_INTENCION = {
    saludo: '¡Hola! Soy PachAI 👋 Podés preguntarme por la agenda, las novedades, los expositores, los ejes temáticos, los sponsors o la ubicación del predio.',
    agradecimiento: '¡Con gusto! Si te queda otra consulta, escribime y la busco en la base de datos.',
    despedida: '¡Hasta luego! Que te vaya bien 👋'
};


const RESPUESTA_FALLBACK =
    'No encontré información sobre esa consulta. Puedes explorar nuestras secciones: ' +
    'Agenda, Expositores, Noticias, Ejes, Sponsors o Ubicación del Predio.';


chatbotCtrl.consultar = async (req, res) => {
    try {
        const texto = sanitizarEntrada(req.body?.query);

        if (!texto) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Debés enviar el campo "query" con la consulta a realizar.'
            });
        }

        const intencion = detectarIntencion(texto);
        if (intencion) {
            return res.status(200).json({
                success: true,
                data: { mensaje: RESPUESTAS_INTENCION[intencion], resultados: [], terminos: [] },
                message: 'Consulta resuelta.'
            });
        }

        const terminos = extraerPalabrasClave(texto);

        
        const seccion = detectarSeccion(terminos, texto);

        
        if (seccion?.tipo === 'texto') {
            return res.status(200).json({
                success: true,
                data: { mensaje: seccion.mensaje, resultados: [], terminos },
                message: 'Consulta resuelta.'
            });
        }

        // Secciones sin tabla propia: mensaje + ficha navegable.
        if (seccion?.tipo === 'estatico') {
            return res.status(200).json({
                success: true,
                data: {
                    mensaje: seccion.mensaje,
                    resultados: construirFicha(seccion),
                    terminos
                },
                message: 'Consulta resuelta.'
            });
        }

        // Sección con tabla: se restringe la búsqueda a su `origen` en lugar de
        // cruzarla con las demás.
        const resultados = await buscarEnBase(terminos, undefined, seccion?.origen ?? null);

        return res.status(200).json({
            success: true,
            data: {
                mensaje: resultados.length > 0
                    ? construirMensajeResultados(seccion, texto, resultados.length)
                    : RESPUESTA_FALLBACK,
                resultados,
                terminos
            },
            message: 'Consulta resuelta.'
        });
    } catch (error) {
        console.error('Error al consultar el chatbot:', error);
        return res.status(500).json({
            success: false,
            data: null,
            message: 'No se pudo completar la consulta en este momento.'
        });
    }
};

chatbotCtrl.buscar = async (req, res) => {
    try {
        const texto = sanitizarEntrada(req.query.q);

        if (!texto) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Debés enviar el parámetro "q" con el término a buscar.'
            });
        }

        const terminos = extraerPalabrasClave(texto);
        const seccion = detectarSeccion(terminos, texto);
        const resultados = await buscarEnBase(terminos, req.query.limit, seccion?.origen ?? null);

        return res.status(200).json({
            success: true,
            data: resultados,
            message: 'Búsqueda resuelta.'
        });
    } catch (error) {
        console.error('Error al buscar en el chatbot:', error);
        return res.status(500).json({
            success: false,
            data: null,
            message: 'No se pudo completar la búsqueda en este momento.'
        });
    }
};


chatbotCtrl.sugerencias = async (req, res) => {
    try {
        const sugerencias = [
            { texto: '¿Quiénes hicieron esta página?', consulta: 'quienes hicieron' },
            { texto: '¿Qué hay en la agenda?', consulta: 'agenda actividades' },
            { texto: '¿Quiénes son los expositores?', consulta: 'expositores empresas' },
            { texto: '¿De qué trata ExpoJuy?', consulta: 'que es expojuy' },
            { texto: 'Ver últimas noticias', consulta: 'noticias novedades' },
            { texto: 'Minería y litio', consulta: 'litio mineria' },
            { texto: 'Fotografías de la feria', consulta: 'galeria fotos' },
            { texto: '¿Quiénes son los sponsors?', consulta: 'sponsors' },
            { texto: '¿Dónde queda el predio?', consulta: 'ubicacion predio mapa' }
        ];

        return res.status(200).json({
            success: true,
            data: sugerencias,
            message: 'Sugerencias obtenidas con éxito.'
        });
    } catch (error) {
        console.error('Error al obtener sugerencias del chatbot:', error);
        return res.status(500).json({
            success: false,
            data: null,
            message: 'No se pudieron obtener las sugerencias.'
        });
    }
};

/**
 * Arma el texto de la burbuja cuando la sección sí devolvió registros.
 *
 * Con sección reconocida el mensaje nombra la sección ("Acá tenés 5 actividades
 * de la agenda"), que es más útil que repetir la consulta textual del usuario.
 *
 * @param {object|null} seccion Entrada de `SECCIONES`, o `null` si no hubo match.
 * @param {string} texto Consulta original del usuario.
 * @param {number} cantidad
 * @returns {string}
 */
function construirMensajeResultados(seccion, texto, cantidad) {
    const plural = pluralCoincidencia(cantidad);

    if (!seccion) {
        return `Encontré ${cantidad} coincidencia${plural} para "${texto}".`;
    }

    // "actividad" ya es singular; el plural es "actividades", no "actividads".
    if (seccion.id === 'agenda') {
        return `Acá tenés ${cantidad} actividad${cantidad === 1 ? '' : 'es'} en la agenda.`;
    }

    return `Acá tenés ${cantidad} coincidencia${plural} en ${seccion.etiqueta}.`;
}

/** Pluraliza "coincidencia" según la cantidad de resultados. */
function pluralCoincidencia(cantidad) {
    return cantidad === 1 ? '' : 's';
}

module.exports = chatbotCtrl;