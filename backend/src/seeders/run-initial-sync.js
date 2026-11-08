require('dotenv').config();
const sequelize = require('../../config/database');
require('../models');
const { seedDatabase } = require('./seed');

async function main() {
  console.log('Validando conexión con PostgreSQL...');
  await sequelize.authenticate();
  console.log('Conexión validada. Sincronizando tablas...');
  await sequelize.sync({ alter: true });
  console.log('Tablas sincronizadas. Ejecutando seed inicial si corresponde...');
  await seedDatabase();
  console.log('¡Sincronización y seed inicial completados exitosamente!');
  await sequelize.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error durante sync/seed:', err);
  process.exit(1);
});
