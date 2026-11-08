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

const poolOptions = {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
};

let sequelize;

if (process.env.DB_REPLICA_HOST && process.env.DB_REPLICA_HOST.trim() !== '') {
    console.log(`[config/database] Configurando pool con Replicación Streaming (Write: ${process.env.DB_HOST}, Read: ${process.env.DB_REPLICA_HOST})`);
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            dialect: process.env.DB_DIALECT || 'postgres',
            logging: false,
            pool: poolOptions,
            replication: {
                write: {
                    host: process.env.DB_HOST,
                    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
                    username: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                    database: process.env.DB_NAME
                },
                read: [
                    {
                        host: process.env.DB_REPLICA_HOST,
                        port: process.env.DB_REPLICA_PORT ? parseInt(process.env.DB_REPLICA_PORT, 10) : 5432,
                        username: process.env.DB_USER,
                        password: process.env.DB_PASSWORD,
                        database: process.env.DB_NAME
                    }
                ]
            }
        }
    );
} else {
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
            dialect: process.env.DB_DIALECT || 'postgres',
            logging: false,
            pool: poolOptions
        }
    );
}

sequelize.authenticate()
    .then(() => console.log('DB is connected to PostgreSQL'))
    .catch(err => console.error('Error al conectar a PostgreSQL:', err));

module.exports = sequelize;