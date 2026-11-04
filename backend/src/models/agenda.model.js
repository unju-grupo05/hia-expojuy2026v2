const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Agenda = sequelize.define('Agenda', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dia: { type: DataTypes.INTEGER, allowNull: false },
    diaSemana: { type: DataTypes.STRING, allowNull: true },
    horaInicio: { type: DataTypes.STRING, allowNull: false },
    horaFin: { type: DataTypes.STRING, allowNull: false },
    titulo: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    lugar: { type: DataTypes.STRING, allowNull: true },
    disertante: { type: DataTypes.STRING, allowNull: true },
    etiqueta: { type: DataTypes.STRING, allowNull: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    tableName: 'agenda',
    timestamps: true
});

module.exports = Agenda;