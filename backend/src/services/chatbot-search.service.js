const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/database');
const MAX_RESULTADOS = 5;
const MAX_TERMINOS = 6;
const MAX_LARGO_TEXTO = 160;
const MAX_TERMINO = 40;

const STOPWORDS = new Set([
    'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
    'y', 'o', 'u', 'e', 'a', 'al', 'en', 'con', 'por', 'para', 'sin', 'sobre',
    'que', 'quien', 'cual', 'donde', 'cuando', 'como', 'cuanto', 'cuantos',
    'hay', 'tienen', 'tiene', 'son', 'es', 'esta', 'este', 'estos', 'estas',
    'me', 'mi', 'te', 'tu', 'se', 'su', 'sus', 'lo', 'le', 'les', 'nos',
    'the', 'and', 'for', 'you', 'are', 'with', 'this', 'that', 'from'
]);

const INTENCIONES = [
    { patron: '^(hola|holis|buenas|buen dia|buenas tardes|buenas noches|hey|holi)$', accion: 'saludo' },
    { patron: '^(gracias|muchas gracias|mil gracias|dale gracias|genio)$', accion: 'agradecimiento' },
    { patron: '^(adios|chao|hasta luego|hasta pronto|nos vemos)$', accion: 'despedida' }
];

const SINONIMOS = {
    fecha: ['fecha', 'fechas', 'cuando', 'dia', 'dias', 'agenda', 'horario', 'cronograma'],
    calendario: ['calendario', 'agenda', 'cronograma', 'programa', 'horario', 'actividad', 'actividades'],
    noticia: ['noticia', 'noticias', 'novedad', 'novedades', 'prensa'],
    agenda: ['agenda', 'charla', 'charlas', 'conferencia', 'conferencias', 'disertacion', 'actividad', 'calendario'],
    lugar: ['lugar', 'ubicacion', 'donde', 'direccion', 'predio', 'mapa', 'ciudad', 'sede'],
    entrada: ['entrada', 'entrar', 'acreditacion', 'acreditaciones', 'pase', 'ticket', 'credencial', 'registro', 'inscripcion'],
    expositor: ['expositor', 'expositores', 'empresa', 'empresas', 'stand', 'stands', 'pabellon'],
    foto: ['foto', 'fotos', 'galeria', 'imagen', 'imagenes'],
    keynote: ['keynote', 'keynotes', 'conferencia', 'charla', 'disertacion'],
    litio: ['litio', 'litera', 'mineria', 'bateria', 'baterias', 'manganeso'],
    energia: ['energia', 'energias', 'renovable', 'solar', 'fotovoltaica', 'eolica']
};

function normalizar(valor) {
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * @param {*} entrada
 * @returns {string}
 */
function sanitizarEntrada(entrada) {
    if (typeof entrada !== 'string') return '';
    const regexControl = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}\\x7f]`, 'g');

    return entrada
        .replace(regexControl, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_LARGO_TEXTO);
}

/**
 * @param {string} texto Texto ya sanitizado.
 * @returns {string[]} Términos únicos, en orden de relevancia.
 */
function extraerPalabrasClave(texto) {
    const base = normalizar(texto);
    if (!base) return [];

    const palabras = base
        .split(/[^a-z0-9ñ]+/)
        .filter(p => p.length >= 3 && p.length <= MAX_TERMINO && !STOPWORDS.has(p));

    const candidatos = [];
    if (palabras.length > 1) candidatos.push(palabras.join(' '));

    for (const palabra of palabras) {
        candidatos.push(palabra);
        for (const sinonimo of SINONIMOS[palabra] || []) {
            candidatos.push(sinonimo);
        }
    }

    const vistos = new Set();
    const terminos = [];
    for (const candidato of candidatos) {
        if (vistos.has(candidato)) continue;
        vistos.add(candidato);
        terminos.push(candidato);
        if (terminos.length >= MAX_TERMINOS) break;
    }

    return terminos;
}

/**
 * Detecta una intención conversacional (saludo / agradecimiento) para que el
 * controller responda sin tocar la base de datos.
 *
 * @param {string} texto
 * @returns {string|null}
 */
function detectarIntencion(texto) {
    const base = normalizar(texto);
    if (!base) return null;

    for (const intencion of INTENCIONES) {
        if (new RegExp(intencion.patron).test(base)) return intencion.accion;
    }

    return null;
}

const RAMAS = [
    {
        origen: 'noticia',
        campos: ['titulo', 'descripcion', 'categoria', '"fecha"::TEXT'],
        filtros: '"vigente" = true',
        ordenInicial: '"fecha" DESC',
        query: `
            SELECT 'noticia' AS origen,
                   'Novedad' AS etiqueta,
                   '/#novedades' AS enlace,
                   3 AS peso,
                   "titulo" AS titulo,
                   COALESCE("descripcion", '') AS descripcion,
                   "categoria" AS metadato,
                   "fecha"::TEXT AS fecha
            FROM noticias
        `
    },
    {
        origen: 'agenda',
        campos: ['titulo', 'descripcion', 'lugar', 'disertante', 'etiqueta'],
        filtros: '',
        ordenInicial: '"dia" ASC, "horaInicio" ASC',
        query: `
            SELECT 'agenda' AS origen,
                   'Agenda' AS etiqueta,
                   '/#agenda' AS enlace,
                   4 AS peso,
                   "titulo" AS titulo,
                   COALESCE("descripcion", '') AS descripcion,
                   COALESCE("etiqueta", "lugar", 'Charla') AS metadato,
                   "dia"::TEXT || ' - ' || "horaInicio" AS fecha
            FROM agenda
        `
    },
    {
        origen: 'eje',
        campos: ['nombre', 'descripcion'],
        filtros: '',
        ordenInicial: '"orden" ASC',
        query: `
            SELECT 'eje' AS origen,
                   'Eje temático' AS etiqueta,
                   '/#sobre-expojuy' AS enlace,
                   2 AS peso,
                   "nombre" AS titulo,
                   "descripcion" AS descripcion,
                   NULL AS metadato,
                   NULL AS fecha
            FROM ejes
        `
    },
    {
        origen: 'expositor',
        campos: ['name', 'description', 'subtitle', 'category', 'origin'],
        filtros: '',
        ordenInicial: '"name" ASC',
        query: `
            SELECT 'expositor' AS origen,
                   'Expositor' AS etiqueta,
                   '/#expositores' AS enlace,
                   5 AS peso,
                   "name" AS titulo,
                   COALESCE("description", '') AS descripcion,
                   COALESCE("subtitle", "category", 'Expositor') AS metadato,
                   NULL AS fecha
            FROM expositores
        `
    },
    {
        origen: 'galeria',
        campos: ['titulo', 'descripcion', 'seccion'],
        filtros: '',
        ordenInicial: '"orden" ASC',
        query: `
            SELECT 'galeria' AS origen,
                   'Galería' AS etiqueta,
                   '/#galeria' AS enlace,
                   1 AS peso,
                   "titulo" AS titulo,
                   COALESCE("descripcion", '') AS descripcion,
                   COALESCE("seccion", 'Galería') AS metadato,
                   NULL AS fecha
            FROM galeria
        `
    }
];

const SECCIONES = [
    {
        id: 'creditos',
        etiqueta: 'Equipo',
        tipo: 'texto',
        terminos: [
            'desarrollador', 'desarrolladores', 'creador', 'creadores', 'quien hizo',
            'quienes hicieron', 'quien programo', 'equipo', 'autores', 'creditos',
            'quien hizo la pagina', 'quienes hicieron la pagina', 'quien creo',
            'quienes crearon', 'quien desarrollo', 'programadores',
            'hizo', 'hicieron', 'crearon', 'creo', 'programo'
        ],
        mensaje:
            '🚀 Esta aplicación fue desarrollada con pasión por: ' +
            'Lautaro Cano, Santiago Padilla, Maximiliano Calpachay y Antonella Cruz.'
    },
    {
        id: 'agenda',
        etiqueta: 'Agenda',
        tipo: 'sql',
        origen: 'agenda',
        ancla: '/#agenda',
        terminos: [
            'agenda', 'cronograma', 'horario', 'horarios', 'programa',
            'actividades', 'conferencia', 'conferencias', 'disertante',
            'disertantes', 'taller', 'talleres', 'capacitacion', 'que dia',
            'dias', 'evento', 'eventos', 'hora',
            'cuando es',
            'calendario', 'charla', 'charlas'
        ]
    },
    {
        id: 'ejes',
        etiqueta: 'Ejes temáticos',
        tipo: 'sql',
        origen: 'eje',
        ancla: '/#sobre-expojuy',
        terminos: [
            'eje', 'ejes', 'tematica', 'tematicas', 'mineria', 'litio',
            'energia', 'energias', 'agroindustria', 'tecnologia', 'sustentabilidad',
            'biotecnologia', 'corredor', 'ejes tematicos'
        ]
    },
    {
        id: 'expositores',
        etiqueta: 'Expositores',
        tipo: 'sql',
        origen: 'expositor',
        ancla: '/#expositores',
        terminos: [
            'expositor', 'expositores', 'empresa', 'empresas', 'stand', 'stands',
            'pabellon', 'pabellones', 'b2b', 'marcas', 'contacto', 'participantes',
            'directorio', 'donde estan'
        ]
    },
    {
        id: 'galeria',
        etiqueta: 'Galería',
        tipo: 'sql',
        origen: 'galeria',
        ancla: '/#galeria',
        terminos: [
            'galeria', 'foto', 'fotos', 'fotografia', 'fotografias', 'imagen',
            'imagenes', 'recuerdos', 'paisaje', 'ver fotos', 'galeria de fotos'
        ]
    },
    {
        id: 'inicio',
        etiqueta: 'ExpoJuy 2026',
        tipo: 'estatico',
        ancla: '/',
        terminos: [
            'inicio', 'bienvenida', 'expojuy', 'de que trata',
            'informacion general', 'que es'
        ],
        mensaje:
            'ExpoJuy 2026 es la exposición que reúne a empresas del agro, la minería ' +
            'y la energía de Jujuy en un solo espacio.',
        ficha: {
            titulo: 'ExpoJuy 2026 — Edición Histórica',
            descripcion:
                'La feria de la agroindustria, la minería y la energía de Jujuy. ' +
                'Se desarrolla del 9 al 12 de octubre en el Predio Ferial de la Ciudad Cultural.',
            metadato: 'Del 9 al 12 de octubre de 2026'
        }
    },
    {
        id: 'publicaciones',
        etiqueta: 'Novedad',
        tipo: 'sql',
        origen: 'noticia',
        ancla: '/#novedades',
        terminos: [
            'publicacion', 'publicaciones', 'noticia', 'noticias', 'novedad',
            'novedades', 'prensa', 'comunicado', 'comunicados', 'actualidad',
            'boletin', 'ultimas noticias'
        ]
    },
    {
        id: 'sponsors',
        etiqueta: 'Sponsors',
        tipo: 'estatico',
        ancla: '/#sponsors-section',
        terminos: [
            'sponsor', 'sponsors', 'patrocinador', 'patrocinadores',
            'auspiciante', 'auspiciantes', 'marcas aliadas', 'apoyo',
            'quienes apoyan', 'empresas aliadas'
        ],
        mensaje:
            'ExpoJuy 2026 cuenta con el apoyo de Exar, Compañía de Seguros, Cannava, ' +
            'Kelimpio, Jujuy Acompaña, Municipalidad de Jujuy, CFI, Cámara de Comercio y ' +
            'Secretaría de Turismo.',
        ficha: {
            titulo: 'Sponsors y marcas aliadas',
            descripcion:
                'Instituciones y empresas que hacen posible la edición 2026 de ExpoJuy.',
            metadato: 'Exar · Cannava · Kelimpio · CFI · Cámara de Comercio'
        }
    },
    {
        id: 'ubicacion-predio',
        etiqueta: 'Ubicación del predio',
        tipo: 'estatico',
        ancla: '/#mapa',
        terminos: [
            'ubicacion', 'predio', 'donde es', 'como llegar', 'mapa', 'lugar',
            'direccion', 'ciudad cultural', 'donde queda', 'donde se hace',
            'geolocalizacion'
        ],
        mensaje:
            'El Predio Ferial de ExpoJuy está en la Ciudad Cultural de San Salvador de Jujuy, ' +
            'con accesos viales y transporte público. Te dejo el mapa interactivo con los ' +
            'pabellones y stands.',
        ficha: {
            titulo: 'Predio Ferial — Ciudad Cultural',
            descripcion:
                'Mapa interactivo con pabellones, stands y accesos viales del predio ferial.',
            metadato: 'Ciudad Cultural, San Salvador de Jujuy'
        }
    }
];

const INDICE_FRASES = SECCIONES
    .flatMap(seccion => seccion.terminos.filter(t => t.includes(' ')).map(termino => ({ termino, seccion })))
    .sort((a, b) => b.termino.length - a.termino.length);

const INDICE_PALABRAS = SECCIONES
    .flatMap(seccion => seccion.terminos.filter(t => !t.includes(' ')).map(termino => ({ termino, seccion })))
    .sort((a, b) => b.termino.length - a.termino.length);

/**
 * Resuelve la sección del sitio a la que apunta la consulta.
 *
 * Se comparan dos cosas, en este orden:
 *
 *   1. Frases contra el texto normalizado completo. Hace falta porque
 *      `extraerPalabrasClave` descarta palabras vacías, y casi todas las
 *      palabras clave compuestas del diccionario las contienen
 *      ("cuando es", "quien hizo", "de que trata"). Sobre los términos ya
 *      recortados, esas frases no existirían nunca.
 *   2. Palabras sueltas contra los términos extraídos.
 *
 * @param {string[]} terminos Términos normalizados de `extraerPalabrasClave`.
 * @param {string} [texto] Texto original normalizado.
 * @returns {object|null} Entrada de `SECCIONES`, o `null` si no coincide ninguna.
 */
function detectarSeccion(terminos, texto = '') {
    const conjunto = new Set(Array.isArray(terminos) ? terminos : []);
    const frase = normalizar(texto);
    const conEspacios = frase ? ` ${frase} ` : '';

    const porFrase = INDICE_FRASES.find(({ termino }) => conEspacios.includes(` ${termino} `));
    if (porFrase) return porFrase.seccion;

    const porPalabra = INDICE_PALABRAS.find(({ termino }) => conjunto.has(termino));
    return porPalabra ? porPalabra.seccion : null;
}

/**
 * Paso 3 del flujo: ejecuta la búsqueda contra PostgreSQL.
 *
 * La consulta se arma una sola vez y se ejecuta con `replacements` (bind
 * params). Los valores nunca se concatenan en el texto SQL, por lo que la
 * sanitizacion cumple su papel defensivo y no de escaping.
 *
 * @param {string[]} terminos
 * @param {number|string} [limite]
 * @param {string|null} [soloOrigen] Restringe la búsqueda a una sola tabla.
 * @returns {Promise<Array<{origen:string, etiqueta:string, enlace:string, titulo:string, descripcion:string, metadato:string|null, fecha:string|null}>>}
 */
async function buscarEnBase(terminos, limite = MAX_RESULTADOS, soloOrigen = null) {
    const limiteSeguro = Math.min(
        Math.max(parseInt(limite, 10) || MAX_RESULTADOS, 1),
        MAX_RESULTADOS
    );

    const disponibles = Array.isArray(terminos) && terminos.length > 0 ? terminos : [];
    if (soloOrigen && disponibles.length === 0) {
        // Sin términos solo tiene sentido para el respaldo navegacional.
        return ejecutar(disponibles, limiteSeguro, soloOrigen, false);
    }
    if (disponibles.length === 0) return [];

    const resultados = await ejecutar(disponibles, limiteSeguro, soloOrigen, true);

    // Respaldo navegacional: si se pidió una sección y no hubo coincidencia
    // literal, se devuelven sus primeros registros en vez de un vacío.
    if (soloOrigen && resultados.length === 0) {
        return ejecutar([], limiteSeguro, soloOrigen, false);
    }

    return resultados;
}

/**
 * @param {string[]} terminos
 * @param {number} limite
 * @param {string|null} soloOrigen
 * @param {boolean} aplicarFiltro `false` lista la tabla sin filtrar por texto.
 * @returns {Promise<object[]>}
 */
async function ejecutar(terminos, limite, soloOrigen, aplicarFiltro) {
    const ramas = soloOrigen ? RAMAS.filter(rama => rama.origen === soloOrigen) : RAMAS;
    if (ramas.length === 0) return [];

    const patrones = terminos.map(term => `%${term}%`);

    const selects = ramas.map(rama => {
        const condiciones = aplicarFiltro
            ? rama.campos.map(columna => `${columna} ILIKE ANY(ARRAY[:patrones])`).join(' OR ')
            : null;

        const where = [
            condiciones,
            rama.filtros || null
        ].filter(Boolean).join(' AND ');

        return `(${rama.query}
                ${where ? `WHERE ${where}` : ''}
                ORDER BY ${aplicarFiltro ? 'peso DESC' : rama.ordenInicial}
                LIMIT :limite)`;
    });

    const cuerpo = selects.join('\n        UNION ALL\n        ');

    const sql = selects.length === 1
        ? selects[0].replace(/^\(|\)$/g, '')
        : `
        ${cuerpo}
        ORDER BY peso DESC, titulo ASC
        LIMIT :limite
    `;

    const resultados = await sequelize.query(sql, {
        replacements: { patrones, limite },
        type: QueryTypes.SELECT
    });

    return resultados.map(fila => ({
        origen: fila.origen,
        etiqueta: fila.etiqueta,
        enlace: fila.enlace,
        titulo: fila.titulo,
        descripcion: resumir(fila.descripcion),
        metadato: fila.metadato ?? null,
        fecha: fila.fecha ?? null
    }));
}

/**
 * @param {object} seccion Entrada de `SECCIONES` con `tipo: 'estatico'`.
 * @returns {object[]}
 */
function construirFicha(seccion) {
    if (!seccion?.ficha) return [];

    return [{
        origen: seccion.id,
        etiqueta: seccion.etiqueta,
        enlace: seccion.ancla,
        titulo: seccion.ficha.titulo,
        descripcion: resumir(seccion.ficha.descripcion),
        metadato: seccion.ficha.metadato ?? null,
        fecha: null
    }];
}

/**
 * Recorta la descripcion a una sola linea breve para las burbujas del chat.
 * Si queda cortado se agrega elipsis.
 *
 * @param {string} texto
 * @param {number} maximo
 * @returns {string}
 */
function resumir(texto, maximo = 180) {
    const limpio = String(texto || '')
        .replace(/\s+/g, ' ')
        .trim();

    if (limpio.length <= maximo) return limpio;
    return `${limpio.slice(0, maximo).replace(/\s+\S*$/, '')}…`;
}

module.exports = {
    MAX_RESULTADOS,
    SECCIONES,
    sanitizarEntrada,
    extraerPalabrasClave,
    detectarIntencion,
    detectarSeccion,
    construirFicha,
    buscarEnBase,
    resumir
};