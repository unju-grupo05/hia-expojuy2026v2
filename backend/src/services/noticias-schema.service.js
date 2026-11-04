const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
async function ensureNoticiasSchemaUpdates() {
    const queryInterface = sequelize.getQueryInterface();
    const noticiasTable = await queryInterface.describeTable('noticias');

    if (!noticiasTable.isLarge) {
        await queryInterface.addColumn('noticias', 'isLarge', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
        console.log('[schema] Columna "noticias.isLarge" agregada.');
    }

    // Permitir múltiples noticias Grandes (se distribuyen 1 por página en frontend).
    // Eliminamos el índice restrictivo antiguo si existía.
    try {
        await queryInterface.sequelize.query(
            'DROP INDEX IF EXISTS noticias_unica_grande'
        );
    } catch (e) {
        // Ignorar si el motor no usa postgres o el índice no existía
    }
}

module.exports = { ensureNoticiasSchemaUpdates };