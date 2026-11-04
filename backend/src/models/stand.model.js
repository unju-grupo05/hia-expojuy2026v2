const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Expositor = require('./expositor.model');
const UbicacionStand = require('./ubicacionStand.model');

const Stand = sequelize.define('Stand', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false
    },
    sector: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    superficie: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('disponible', 'reservado', 'cedido'),
        defaultValue: 'disponible',
        allowNull: false
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    expositorId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        references: {
            model: Expositor,
            key: 'id'
        }
    }
}, {
    tableName: 'stands',
    timestamps: true
});

// Definir asociaciones relacionales
if (!Stand.associations?.expositor) {
  Stand.belongsTo(Expositor, { foreignKey: 'expositorId', as: 'expositor' });
}
if (!Expositor.associations?.stands) {
  Expositor.hasMany(Stand, { foreignKey: 'expositorId', as: 'stands' });
}

// Asociación 1 a 1 estricta con UbicacionStand
if (!Stand.associations?.ubicacion) {
  Stand.hasOne(UbicacionStand, { foreignKey: 'standId', as: 'ubicacion', onDelete: 'CASCADE' });
}
if (!UbicacionStand.associations?.stand) {
  UbicacionStand.belongsTo(Stand, { foreignKey: 'standId', as: 'stand', onDelete: 'CASCADE' });
}

module.exports = Stand;

