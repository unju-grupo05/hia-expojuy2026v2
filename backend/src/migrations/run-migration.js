require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/database');

async function runMigration() {
  console.log('[Migration] Iniciando migración DDL y normalización...');

  const sqlPath = path.resolve(__dirname, 'migracion_normalizacion_stands.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  try {
    await sequelize.query(sqlContent);
    console.log('[Migration] Script SQL ejecutado exitosamente.');

    // Verificaciones
    const [standsCountRes] = await sequelize.query('SELECT COUNT(*) FROM stands;');
    const [ubicCountRes] = await sequelize.query('SELECT COUNT(*) FROM ubicaciones_stand;');
    const [orphanRes] = await sequelize.query('SELECT COUNT(*) FROM stands WHERE id NOT IN (SELECT stand_id FROM ubicaciones_stand);');
    const [syncedExpRes] = await sequelize.query('SELECT COUNT(*) FROM expositores WHERE stand IS NOT NULL;');

    const standsCount = parseInt(standsCountRes[0].count, 10);
    const ubicCount = parseInt(ubicCountRes[0].count, 10);
    const orphanCount = parseInt(orphanRes[0].count, 10);
    const syncedExpCount = parseInt(syncedExpRes[0].count, 10);

    console.log(`[Verificación] Total stands: ${standsCount}`);
    console.log(`[Verificación] Total ubicaciones_stand: ${ubicCount}`);
    console.log(`[Verificación] Stands huérfanos sin ubicación: ${orphanCount}`);
    console.log(`[Verificación] Expositores con stands concatenados: ${syncedExpCount}`);

    if (standsCount !== 159 || ubicCount !== 159 || orphanCount !== 0) {
      throw new Error(`Inconsistencia en los datos: stands=${standsCount}, ubicaciones=${ubicCount}, huérfanos=${orphanCount}`);
    }

    console.log('[Migration] ¡Migración DDL completada y validada con 100% de integridad!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Error fatal durante la migración:', error);
    process.exit(1);
  }
}

runMigration();
