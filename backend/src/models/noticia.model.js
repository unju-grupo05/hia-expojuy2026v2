const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Noticia = sequelize.define('Noticia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    titulo: { type: DataTypes.STRING, allowNull: false },
    categoria: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    imagen: { type: DataTypes.STRING, allowNull: true },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    linkExterno: { type: DataTypes.STRING, allowNull: true },
    vigente: { type: DataTypes.BOOLEAN, defaultValue: true },
    isLarge: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'noticias',
    timestamps: true
});

module.exports = Noticia;