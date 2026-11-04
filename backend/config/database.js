require('dotenv').config();
const { Sequelize } = require('sequelize');

// Variables obligatorias: sin ellas la aplicación NO debe arrancar.
// Se prohíben valores por defecto para no exponer credenciales en el repositorio.
const REQUIRED_ENV_VARS = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST'];

const missingEnvVars = REQUIRED_ENV_VARS.filter(
    (key) => typeof process.env[key] !== 'string' || process.env[key].trim() === ''
);

if (missingEnvVars.length > 0) {
    throw new Error(
        `[config/database] Faltan variables de entorno obligatorias: ${missingEnvVars.join(', ')}. ` +
        'Copiá ".env.example" a ".env" y completá los valores. ' +
        'Por seguridad no existen valores por defecto para las credenciales de conexión.'
    );
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        dialect: process.env.DB_DIALECT || 'postgres',
        logging: false,
    }
);

sequelize.authenticate()
    .then(() => console.log('DB is connected to PostgreSQL'))
    .catch(err => console.error('Error al conectar a PostgreSQL:', err));

module.exports = sequelize;