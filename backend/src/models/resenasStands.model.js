const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ResenaStand = sequelize.define('ResenaStand', {
  id: {
    type: DataTypes.INTEGER,
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
    allowNull: false,
    field: 'usuario_id'
  },
  puntuacion: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comentario: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  creado_en: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'creado_en'
  }
}, {
  tableName: 'resenas_stands',
  timestamps: false,
  indexes: [
    {
      name: 'idx_resenas_stands_stand',
      fields: ['stand_id']
    },
    {
      name: 'idx_resenas_stands_usuario',
      fields: ['usuario_id']
    }
  ]
});

module.exports = ResenaStand;
