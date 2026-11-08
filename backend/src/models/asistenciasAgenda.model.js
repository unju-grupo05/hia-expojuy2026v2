const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const AsistenciaAgenda = sequelize.define('AsistenciaAgenda', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agenda_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'agenda_id'
  },
  usuario_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'usuario_id'
  },
  estado: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'inscripto',
    validate: {
      isIn: [['inscripto', 'asistio', 'cancelo']]
    }
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro'
  }
}, {
  tableName: 'asistencias_agenda',
  timestamps: false,
  indexes: [
    {
      name: 'idx_asistencias_agenda_agenda',
      fields: ['agenda_id']
    },
    {
      name: 'idx_asistencias_agenda_usuario',
      fields: ['usuario_id']
    }
  ]
});

module.exports = AsistenciaAgenda;
