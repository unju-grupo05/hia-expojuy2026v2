const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const LogChatbot = sequelize.define('LogChatbot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pregunta: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  respuesta: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  intencion: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tiempo_respuesta_ms: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'tiempo_respuesta_ms'
  },
  fue_util: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'fue_util'
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'logs_chatbot',
  timestamps: false,
  indexes: [
    {
      name: 'idx_logs_chatbot_fecha',
      fields: ['fecha']
    },
    {
      name: 'idx_logs_chatbot_intencion',
      fields: ['intencion']
    }
  ]
});

module.exports = LogChatbot;
