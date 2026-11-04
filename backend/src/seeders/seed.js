const bcrypt = require('bcrypt');

const Noticia = require('../models/noticia.model.js');
const Galeria = require('../models/galeria.model.js');
const Agenda = require('../models/agenda.model.js');
const Eje = require('../models/eje.model.js');
const Expositor = require('../models/expositor.model.js');
const Usuario = require('../models/usuario.model.js');
const Stand = require('../models/stand.model.js');
const { ejecutarSeed: seedStandsYExpositores } = require('./seed-stands-expositores.js');

const noticias = [
    {
        slug: 'bioceanico',
        titulo: 'Somos Desarrollo, Potencia & Futuro',
        categoria: 'Infraestructura',
        descripcion: 'La ExpoJuy 2026 se realizará en el predio de la Ciudad Cultural.',
        imagen: '/img/ExpoJuy-1.webp',
        fecha: '2026-10-09',
        linkExterno: null,
        vigente: true,
        isLarge: true
    },
    {
        slug: 'cauchari',
        titulo: 'El Parque Solar Cauchari expondrá sus proyectos de expansión e hidrógeno verde en el Pabellón de Energías',
        categoria: 'Energías Limpias',
        descripcion: 'El mayor parque solar a gran altura del mundo presentará sus nuevas fases y su hoja de ruta de hidrógeno verde.',
        imagen: '/img/Cauchari.jpg',
        fecha: '2026-08-02',
        linkExterno: null,
        vigente: true,
        isLarge: false
    },
    {
        slug: 'ventanilla',
        titulo: 'Presentarán sistema de ventanilla única digital para acelerar el comercio fronterizo',
        categoria: 'Innovación',
        descripcion: 'Una plataforma digital centralizará los trámites de importación y exportación en pasos fronterizos integrados.',
        imagen: '/img/Expojuy-8.webp',
        fecha: '2026-10-11',
        linkExterno: null,
        vigente: true,
        isLarge: false
    }
];

const galeria = [
    { titulo: 'Ciudad Cultural', descripcion: 'Sede Central', imagen: '/img/Cultural.png', seccion: 'Sede', orden: 1 },
    { titulo: 'Arte y Tradición de Nuestra Tierra', descripcion: 'Identidad, colores y artesanías que representan el orgullo de La Quiaca y la Puna.', imagen: '/img/ExpoJuy-9.webp', seccion: 'Identidad', orden: 2 },
    { titulo: 'Innovación en Maquinaria y Tecnología', descripcion: 'Las últimas novedades en transporte, construcción y equipamiento agroindustrial.', imagen: '/img/ExpoJuy-10.webp', seccion: 'Industria', orden: 3 },
    { titulo: 'Innovación en Movilidad', descripcion: 'Presencia institucional, flotas de vanguardia y servicios de larga distancia.', imagen: '/img/ExpoJuy-11.webp', seccion: 'Movilidad', orden: 4 },
    { titulo: 'Robótica y Educación', descripcion: 'Estudiantes explorando proyectos de tecnología y desarrollo del futuro.', imagen: '/img/ExpoJuy-12.webp', seccion: 'Educación', orden: 5 },
    { titulo: 'Cobertura Periodística y Medios', descripcion: 'Información al instante y transmisión en vivo de la mano de los principales medios.', imagen: '/img/ExpoJuy-13.webp', seccion: 'Prensa', orden: 6 },
    { titulo: 'Industria Minera y Sustentabilidad', descripcion: 'Presencia de empresas clave impulsando el futuro industrial y la minería sustentable.', imagen: '/img/ExpoJuy-14.webp', seccion: 'Minería', orden: 7 },
    { titulo: 'Espectáculos y Ritmo en Vivo', descripcion: 'Comparsas, música y el color de los carnavales iluminando las noches de la Expo.', imagen: '/img/ExpoJuy-15.webp', seccion: 'Cultura', orden: 8 },
    { titulo: 'Festival de Música y Tradición', descripcion: 'Viví la emoción y el folklore en las noches de la Expo.', imagen: '/img/ExpoJuy-16.webp', seccion: 'Cultura', orden: 9 },
    { titulo: 'ExpoJuy 2026', descripcion: 'Identidad Oficial', imagen: '/img/ExpoJuy-2.webp', seccion: 'Institucional', orden: 10 }
];

const agenda = [
    { dia: 1, diaSemana: '09 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'César y su grupo Felicidad', descripcion: 'ARTISTA CONVOCANTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 4 },
    { dia: 1, diaSemana: '09 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Mónica Pantoja', descripcion: 'ARTISTA TRAYECTORIA', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 5 },
    { dia: 1, diaSemana: '09 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Becho Riveiro', descripcion: 'ARTISTA TRAYECTORIA', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 6 },
    { dia: 1, diaSemana: '09 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Carlita Celeste', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 7 },
    { dia: 1, diaSemana: '09 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'La Cantada', descripcion: 'ARTISTA TRAYECTORIA', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 8 },

    { dia: 2, diaSemana: '10 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'La Kostumbre', descripcion: 'ARTISTA CONVOCANTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 2 },
    { dia: 2, diaSemana: '10 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Grupo Echevé', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 3 },
    { dia: 2, diaSemana: '10 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Samira', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 4 },
    { dia: 2, diaSemana: '10 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Tunay', descripcion: 'ARTISTA TRAYECTORIA', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 5 },
    { dia: 2, diaSemana: '10 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Proyecto 2', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 6 },
    { dia: 2, diaSemana: '10 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'La Revelación', descripcion: 'ARTISTA CONVOCANTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 6 },

    { dia: 3, diaSemana: '11 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Coroico', descripcion: 'ARTISTA CONVOCANTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 2 },
    { dia: 3, diaSemana: '11 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Tati Dominguez', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 3 },
    { dia: 3, diaSemana: '11 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Los Copleros', descripcion: 'ARTISTA TRAYECTORIA', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 4 },
    { dia: 3, diaSemana: '11 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Daniel Vedia', descripcion: 'ARTISTA TRAYECTORIA', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 5 },
    { dia: 3, diaSemana: '11 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Amaranta', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 6 },

    { dia: 4, diaSemana: '12 Oct 2026', horaInicio: '17:00', horaFin: '19:00', titulo: 'Elección Representante', descripcion: '', lugar: 'Auditorio Plenario A', disertante: null, etiqueta: 'Shows', orden: 1 },
    { dia: 4, diaSemana: '12 Oct 2026', horaInicio: '19:00', horaFin: '20:00', titulo: 'Vistiendo Raíces', descripcion: 'Desfile de diseños textiles "Origen entre mundos"', lugar: '-', disertante: null, etiqueta: 'Desfile', orden: 1 },
    { dia: 4, diaSemana: '12 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Ciclo Mujeres en escena', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 2 },
    { dia: 4, diaSemana: '12 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Navi', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 3 },
    { dia: 4, diaSemana: '12 Oct 2026', horaInicio: '20:00', horaFin: '24:00', titulo: 'Seba Mealla', descripcion: 'ARTISTA EMERGENTE', lugar: 'Escenario Exterior', disertante: null, etiqueta: 'Shows', orden: 4 }
];

const ejes = [
    { numero: 1, nombre: 'Minería & Litio Sustentable', descripcion: 'Industrialización del litio, estándares ESG, electromovilidad y desarrollo de proveedores locales de alta competitividad.', icono: 'lightbulb', orden: 1 },
    { numero: 2, nombre: 'Energías Renovables & Hidrógeno', descripcion: 'El potencial solar de la Puna, Parque Cauchari, almacenamiento BESS y proyectos de descarbonización productiva.', icono: 'solar_power', orden: 2 },
    { numero: 3, nombre: 'Corredor Bioceánico & Logística', descripcion: 'Paso de Jama como nodo neurálgico que conecta puertos del Atlántico (Brasil) y Pacífico (Chile) con Asia.', icono: 'rv_hookup', orden: 3 },
    { numero: 4, nombre: 'Agroindustria & Biotecnología', descripcion: 'Producción tabacalera, cañera, citrícola y bioinsumos con trazabilidad digital y acceso a mercados internacionales.', icono: 'agriculture', orden: 4 },
    { numero: 5, nombre: 'Economía del Conocimiento & IA', descripcion: 'Software factory, robótica minera, ciberseguridad industrial y formación de talento tecnológico andino.', icono: 'memory', orden: 5 },
    { numero: 6, nombre: 'Turismo Internacional & Identidad', descripcion: 'Quebrada de Humahuaca, Tren Solar, gastronomía andina de autor e inversiones en hotelería de categoría premium.', icono: 'travel_explore', orden: 6 }
];

const REQUIRED_ADMIN_ENV_VARS = ['ADMIN_INITIAL_EMAIL', 'ADMIN_INITIAL_PASSWORD'];

const seedUsuarioAdmin = async () => {
    const total = await Usuario.count();
    if (total === 0) {
        const faltantes = REQUIRED_ADMIN_ENV_VARS.filter(
            (key) => typeof process.env[key] !== 'string' || process.env[key].trim() === ''
        );

        if (faltantes.length > 0) {
            throw new Error(
                `[seed] La tabla de usuarios está vacía y no se puede crear el administrador inicial: ` +
                `faltan las variables de entorno ${faltantes.join(', ')}. ` +
                'Definí ADMIN_INITIAL_EMAIL y ADMIN_INITIAL_PASSWORD en ".env" y volvé a ejecutar el seed. ' +
                'No se crea ningún usuario con credenciales por defecto.'
            );
        }

        const hashedPassword = await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD, 10);

        await Usuario.create({
            legajo: process.env.ADMIN_INITIAL_LEGAJO || 'ADM-001',
            dni: process.env.ADMIN_INITIAL_DNI || '00000000',
            correo: process.env.ADMIN_INITIAL_EMAIL,
            nombre: process.env.ADMIN_INITIAL_NOMBRE || 'Administrador',
            apellido: process.env.ADMIN_INITIAL_APELLIDO || 'del Sistema',
            password: hashedPassword,
            rol: 'admin'
        });
        console.log(`Seed: Usuario admin creado con el correo ${process.env.ADMIN_INITIAL_EMAIL}.`);
    }
};

const seedIfEmpty = async (Model, datos, etiqueta) => {
    const total = await Model.count();
    if (total === 0 && datos.length > 0) {
        await Model.bulkCreate(datos);
        console.log(`Seed: ${datos.length} ${etiqueta} insertados.`);
    }
};

const seedDatabase = async () => {
    // El administrador se gestiona de forma aislada: si faltan sus variables de entorno,
    // el resto del contenido de demostración debe seguir sembrándose.
    try {
        await seedUsuarioAdmin();
    } catch (error) {
        console.error('Error al crear el usuario admin:', error.message);
    }

    try {
        await seedIfEmpty(Noticia, noticias, 'noticias');
        await seedIfEmpty(Galeria, galeria, 'ítems de galería');
        await seedIfEmpty(Agenda, agenda, 'actividades de agenda');
        await seedIfEmpty(Eje, ejes, 'ejes temáticos');
        // Si la tabla stands está vacía, sembrar automáticamente expositores, stands y ubicaciones 3D reales
        const totalStands = await Stand.count();
        if (totalStands === 0) {
            console.log('Seed: Base de datos sin stands detectada. Ejecutando siembra inicial...');
            await seedStandsYExpositores(false);
        }
    } catch (error) {
        console.error('Error al ejecutar el seed:', error.message);
    }
};

module.exports = { seedDatabase };