const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Eje = sequelize.define('Eje', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    icono: { type: DataTypes.STRING, allowNull: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    tableName: 'ejes',
    timestamps: true
});

module.exports = Eje;