const swaggerAutogen = require('swagger-autogen')();

/**
 * Documentacion OpenAPI de la API ExpoJuy 2026.
 *
 * `endpointsFiles` recorre los routers de `src/routes`, que son los unicos
 * lugares donde se registran los endpoints (`index.js` solo los monta). Asi la
 * documentacion reflects the real API en lugar de la de un unico archivo.
 */
const doc = {
    info: {
        title: 'API ExpoJuy 2026',
        description: 'Documentacion de los endpoints del backend de ExpoJuy 2026.',
        version: '1.0.0'
    },
    host: 'localhost:3000',
    basePath: '/',
    schemes: ['http', 'https'],
    tags: [
        {
            name: 'Usuarios',
            description: 'Operaciones relacionadas con los usuarios.'
        },
        {
            name: 'Publicaciones',
            description: 'Operaciones relacionadas con las publicaciones.'
        },
        {
            name: 'Expositores',
            description: 'Operaciones relacionadas con los expositores.'
        },
        {
            name: 'Agenda',
            description: 'Operaciones relacionadas con el cronograma de actividades.'
        },
        {
            name: 'Correos',
            description: 'Suscripciones a recordatorios de agenda.'
        },
        {
            name: 'Ejes',
            description: 'Operaciones relacionadas con los ejes tematicos.'
        },
        {
            name: 'Galeria',
            description: 'Operaciones relacionadas con la galeria de imagenes.'
        },
        {
            name: 'Medios',
            description: 'Carga y administracion de archivos multimedia.'
        },
        {
            name: 'Reuniones B2B',
            description: 'Solicitudes de reuniones entre clientes y expositores.'
        },
        {
            name: 'Stands',
            description: 'Operaciones comerciales y estado de stands.'
        },
        {
            name: 'Ubicaciones 3D',
            description: 'Coordenadas, geometría y dimensiones tridimensionales para Three.js.'
        }
    ],
    definitions: {
        Publicacion: {
            titulo: 'Ejemplo de titulo',
            contenido: 'Contenido de la publicación',
            imagenAsociada: 'base64string...',
            fechaPublicacion: '2024-01-01',
            vigente: true,
            usuarioLegajo: 123
        },
        Usuario: {
            legajo: 123,
            nombre: 'Juan',
            apellido: 'Pérez',
            email: 'juan@example.com'
        }
    }
};

const outputFile = './swagger_output.json';
const endpointsFiles = ['./src/routes/*.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log(`Documentación generada en ${outputFile}`);
});
