const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Galeria = sequelize.define('Galeria', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    titulo: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    imagen: { type: DataTypes.TEXT, allowNull: false },
    seccion: { type: DataTypes.STRING, allowNull: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    tableName: 'galeria',
    timestamps: true
});

module.exports = Galeria;