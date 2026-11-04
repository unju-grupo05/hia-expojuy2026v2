require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const sequelize = require('./config/database.js');
const iniciarCronRecordatorios = require('./src/services/reminder.job');
const { ensureB2BSchemaUpdates } = require('./src/services/b2b-schema.service');
const { ensureNoticiasSchemaUpdates } = require('./src/services/noticias-schema.service');
const { ensureChatbotSearchIndexes } = require('./src/services/chatbot-search-index.service');

require('./src/models');

const { seedDatabase } = require('./src/seeders/seed');

const app = express();
app.use(compression());

// Necesario para que el rate limiting por IP funcione correctamente detrás de un
// reverse proxy (nginx, cloud). Sin esto, todas las peticiones parecen venir del proxy.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. CORS dinámico para desarrollo local y producción
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Servir imágenes con caché de 1 año
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1y', etag: true }));

// Salud del servicio (healthcheck de Docker y monitoreo): responde 503 si no hay conexión a la base.
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', db: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

// Rutas
app.use('/api/noticias', require('./src/routes/noticia.route.js'));
app.use('/api/galerias', require('./src/routes/galeria.route.js'));
app.use('/api/agendas', require('./src/routes/agenda.route.js'));
app.use('/api/ejes', require('./src/routes/eje.route.js'));
app.use('/api/expositores', require('./src/routes/expositor.route.js'));
app.use('/api/stands', require('./src/routes/stand.route.js'));
app.use('/api/ubicaciones-stands', require('./src/routes/ubicacionStand.route.js'));
app.use('/api/correos', require('./src/routes/correo.route.js'));
app.use('/api/usuarios', require('./src/routes/usuario.route.js'));
app.use('/api/admin/media', require('./src/routes/media.route.js'));
app.use('/api/media', require('./src/routes/media.route.js'));
app.use('/api/reuniones-b2b', require('./src/routes/reunionB2B.route.js'));
app.use('/api/chatbot', require('./src/routes/chatbot.route.js'));

iniciarCronRecordatorios();

try {
  const swaggerUi = require('swagger-ui-express');
  const swaggerDocument = require('./swagger_output.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  console.log("Swagger no configurado aún o falta swagger_output.json");
}

const PORT = process.env.PORT || 3000;

// `force` borra y recrea todas las tablas: solo se activa a pedido, nunca por defecto.
sequelize.sync({ force: process.env.DB_SYNC_FORCE === 'true', alter: process.env.DB_SYNC_ALTER === 'true' })
  .then(async () => {
    console.log('Tablas sincronizadas con PostgreSQL.');

    try {
      await ensureB2BSchemaUpdates();
      await ensureNoticiasSchemaUpdates();
      // Si `force` recreó las tablas, también borró los índices propios: hay que
      // recrearlos para que el chatbot no caiga en un sequential scan.
      await ensureChatbotSearchIndexes();
    } catch (schemaError) {
      console.error('Error al actualizar el esquema B2B, Noticias o Chatbot:', schemaError);
      throw schemaError;
    }

    try {
      await seedDatabase();
      console.log('Base de datos poblada exitosamente.');
    } catch (seedError) {
      console.error('Error durante la ejecución del seeder:', seedError);
    }

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al sincronizar con PostgreSQL:', err);
    // Sin base el servidor no puede atender: terminar para que el orquestador lo reinicie.
    process.exit(1);
  });