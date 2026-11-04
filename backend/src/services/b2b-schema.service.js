const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

async function ensureB2BSchemaUpdates() {
    const queryInterface = sequelize.getQueryInterface();
    const expositorTable = await queryInterface.describeTable('expositores');

    if (!expositorTable.email) {
        await queryInterface.addColumn('expositores', 'email', {
            type: DataTypes.STRING(254),
            allowNull: true
        });
    }

    const b2bTable = await queryInterface.describeTable('reuniones_b2b');
    const requestedTimeColumns = [
        ['fecha', 'fechaSolicitada'],
        ['horaInicio', 'horaInicioSolicitada'],
        ['horaFin', 'horaFinSolicitada']
    ];

    for (const [legacyName, requestedName] of requestedTimeColumns) {
        if (b2bTable[legacyName] && !b2bTable[requestedName]) {
            await queryInterface.renameColumn('reuniones_b2b', legacyName, requestedName);
        }
    }
}

module.exports = { ensureB2BSchemaUpdates };
