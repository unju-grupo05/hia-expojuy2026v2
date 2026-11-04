const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Expositor = require('./expositor.model');

const ReunionB2B = sequelize.define('ReunionB2B', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombreCliente: { type: DataTypes.STRING(160), allowNull: false },
    empresaCliente: { type: DataTypes.STRING(180), allowNull: false },
    emailCliente: { type: DataTypes.STRING(254), allowNull: false },
    telefonoCliente: { type: DataTypes.STRING(40), allowNull: false },
    empresaExpositora: { type: DataTypes.STRING(180), allowNull: false },
    expositorId: { type: DataTypes.STRING, allowNull: true },
    fechaSolicitada: { type: DataTypes.DATEONLY, allowNull: false },
    horaInicioSolicitada: { type: DataTypes.TIME, allowNull: false },
    horaFinSolicitada: { type: DataTypes.TIME, allowNull: false },
    cantidadAsistentes: { type: DataTypes.INTEGER, allowNull: false },
    motivo: { type: DataTypes.TEXT, allowNull: false },
    modalidad: { type: DataTypes.ENUM('presencial', 'virtual'), allowNull: false },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    estado: { type: DataTypes.ENUM('pendiente'), allowNull: false, defaultValue: 'pendiente' },
    emailExpositorEnviado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
    tableName: 'reuniones_b2b',
    timestamps: true
});

ReunionB2B.belongsTo(Expositor, { foreignKey: 'expositorId', as: 'expositor', constraints: false });

module.exports = ReunionB2B;
