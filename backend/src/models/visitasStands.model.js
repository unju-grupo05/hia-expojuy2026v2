const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const VisitaStand = sequelize.define('VisitaStand', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  stand_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'stand_id'
  },
  usuario_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'usuario_id'
  },
  fecha_visita: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_visita'
  },
  canal: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [['mapa_3d', 'totem_qr', 'web']]
    }
  },
  dispositivo: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tiempo_permanencia_seg: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'tiempo_permanencia_seg'
  },
  calificacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  tableName: 'visitas_stands',
  timestamps: false,
  indexes: [
    {
      name: 'idx_visitas_stands_stand_id',
      fields: ['stand_id']
    },
    {
      name: 'idx_visitas_stands_fecha',
      fields: ['fecha_visita']
    }
  ]
});

module.exports = VisitaStand;
