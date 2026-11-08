require('dotenv').config();
const path = require('path');
const sequelize = require('../../config/database');
const Expositor = require('../models/expositor.model');
const Stand = require('../models/stand.model');
const UbicacionStand = require('../models/ubicacionStand.model');
const seedData = require('./data/stands-seed.json');

/**
 * Ejecuta la siembra transaccional ACID de Expositores, Stands y Ubicaciones 3D
 * @param {boolean} isStandalone - Indica si se ejecuta como script independiente (CLI) o llamado programáticamente
 */
async function ejecutarSeed(isStandalone = false) {
    const inicio = Date.now();
    console.log('Iniciando siembra de Expositores, Stands y Ubicaciones 3D reales...');

    const transaction = await sequelize.transaction();

    try {
        await sequelize.authenticate();
        console.log('Conexión con PostgreSQL validada.');

        // 1. Limpieza de tablas previas (respetando dependencias relacionales)
        console.log('Limpiando registros anteriores de ubicaciones, stands y expositores...');
        await UbicacionStand.destroy({ where: {}, force: true, transaction });
        await Stand.destroy({ where: {}, truncate: { cascade: true }, transaction });
        await Expositor.destroy({ where: {}, truncate: { cascade: true }, transaction });

        // 2. Carga de Expositores reales
        await Expositor.bulkCreate(seedData.expositores, { transaction });
        console.log(`${seedData.expositores.length} expositores reales guardados en 'expositores'.`);

        // 3. Carga de Stands reales con asignación de Eje temático
        const standsConEje = seedData.stands.map((s, idx) => ({
            ...s,
            eje_id: s.eje_id || ((idx % 6) + 1)
        }));
        await Stand.bulkCreate(standsConEje, { transaction });
        console.log(`${standsConEje.length} stands guardados en 'stands'.`);

        // 4. Carga de Ubicaciones espaciales 3D (Normalización 3NF)
        await UbicacionStand.bulkCreate(seedData.ubicaciones, { transaction });
        console.log(`${seedData.ubicaciones.length} ubicaciones 3D vinculadas en 'ubicaciones_stand'.`);

        await transaction.commit();

        const conCoords = seedData.ubicaciones.filter(u => u.x !== 0 || u.y !== 0 || u.z !== 0).length;
        const conExpositor = seedData.stands.filter(s => s.expositorId !== null).length;
        const duracion = ((Date.now() - inicio) / 1000).toFixed(2);

        console.log(`¡Sincronización completada con éxito en ${duracion}s!`);
        console.log(`   Total stands: ${seedData.stands.length}`);
        console.log(`   Ubicaciones 3D vinculadas: ${seedData.ubicaciones.length} (no nulas: ${conCoords})`);
        console.log(`   Stands con expositor asociado (reservado/cedido): ${conExpositor}`);
        console.log(`   Stands disponibles: ${seedData.stands.length - conExpositor}`);
        console.log(`   Total expositores reales: ${seedData.expositores.length}`);

    } catch (error) {
        await transaction.rollback();
        console.error('Error durante la ejecución del seeder:', error.name, ':', error.message);
        if (error.original) {
            console.error('   Detalle DB:', error.original.detail || error.original.message);
        }
        if (isStandalone) {
            process.exit(1);
        }
        throw error;
    } finally {
        if (isStandalone) {
            await sequelize.close();
            console.log('🔌 Conexión con PostgreSQL cerrada.');
            process.exit(0);
        }
    }
}

if (require.main === module) {
    ejecutarSeed(true);
}

module.exports = { ejecutarSeed };
