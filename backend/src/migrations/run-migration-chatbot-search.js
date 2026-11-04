require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/database');

async function runMigration() {
    console.log('[Migration] Iniciando índices de búsqueda del chatbot...');

    const sqlPath = path.resolve(__dirname, 'migracion_busqueda_chatbot.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    try {
        await sequelize.query(sqlContent);
        console.log('[Migration] Script SQL ejecutado exitosamente.');

        const [resultados] = await sequelize.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname LIKE '%\\_trgm'
            ORDER BY indexname;
        `);

        console.log(`[Verificación] Índices trigram activos: ${resultados.length}`);
        resultados.forEach(({ indexname }) => console.log(`  - ${indexname}`));

        console.log('[Migration] Migración de búsqueda completada.');
        process.exit(0);
    } catch (error) {
        console.error('[Migration] Error al ejecutar la migración de búsqueda:', error);
        process.exit(1);
    }
}

runMigration();