require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/database');

async function runMigration() {
    console.log('[Migration] Iniciando columna logo para expositores...');

    const sqlPath = path.resolve(__dirname, 'migracion_logo_expositor.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    try {
        await sequelize.query(sqlContent);
        console.log('[Migration] Script SQL ejecutado exitosamente.');

        const [colRes] = await sequelize.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'expositores'
              AND column_name = 'logo';
        `);

        if (colRes.length === 0) {
            throw new Error('La columna "expositores.logo" no existe tras la migración.');
        }

        const [logosRes] = await sequelize.query('SELECT COUNT(*) FROM expositores WHERE logo IS NOT NULL;');
        const conLogo = parseInt(logosRes[0].count, 10);

        const col = colRes[0];
        console.log(`[Verificación] Columna: ${col.column_name} (${col.data_type}(${col.character_maximum_length}), null=${col.is_nullable})`);
        console.log(`[Verificación] Expositores con logo: ${conLogo}`);

        console.log('[Migration] Migración de logo completada.');
        process.exit(0);
    } catch (error) {
        console.error('[Migration] Error al ejecutar la migración del logo:', error);
        process.exit(1);
    }
}

runMigration();