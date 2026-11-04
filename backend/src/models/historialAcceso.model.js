const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Usuario = require('./usuario.model');

const HistorialAcceso = sequelize.define('HistorialAcceso', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  resultado: {
    type: DataTypes.ENUM('exitoso', 'fallido'),
    allowNull: false
  },
  usuario_id: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'usuario_id'
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  emailIntentado: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'email_intentado'
  }
}, {
  tableName: 'historial_accesos',
  timestamps: true
});


// Relación: Un historial de acceso pertenece a un usuario (si corresponde)
HistorialAcceso.belongsTo(Usuario, { foreignKey: 'usuario_id', targetKey: 'legajo', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Usuario.hasMany(HistorialAcceso, { foreignKey: 'usuario_id', sourceKey: 'legajo' });

module.exports = HistorialAcceso;
