const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Usuario = sequelize.define('Usuario', {
  legajo: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  dni: { type: DataTypes.STRING, allowNull: false },
  correo: { type: DataTypes.STRING, allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  apellido: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  rol: { type: DataTypes.ENUM('admin'), allowNull: false }
}, {
  tableName: 'usuarios',
  timestamps: true
});

module.exports = Usuario;
