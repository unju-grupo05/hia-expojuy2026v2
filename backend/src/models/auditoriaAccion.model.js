const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const Usuario = require('./usuario.model');

const AuditoriaAccion = sequelize.define('AuditoriaAccion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  accion: {
    type: DataTypes.STRING, 
    allowNull: false
  },
  tabla: {
    type: DataTypes.STRING, 
    allowNull: false
  },
  registroId: {
    type: DataTypes.STRING, 
    allowNull: false
  },
  detalles: {
    type: DataTypes.TEXT, 
    allowNull: true
  }
}, {
  tableName: 'auditoria_acciones',
  timestamps: true 
});

AuditoriaAccion.belongsTo(Usuario, { foreignKey: 'usuarioLegajo', targetKey: 'legajo' });
Usuario.hasMany(AuditoriaAccion, { foreignKey: 'usuarioLegajo', sourceKey: 'legajo' });

module.exports = AuditoriaAccion;
