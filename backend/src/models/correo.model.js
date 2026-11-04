const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Correo = sequelize.define('Correo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING, allowNull: true },
    empresa: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: false },
    asunto: { type: DataTypes.STRING, allowNull: true },
    mensaje: { type: DataTypes.TEXT, allowNull: true },
    perfil: { type: DataTypes.STRING, allowNull: true },
    tipo: { type: DataTypes.STRING, allowNull: false, defaultValue: 'contacto' },
    estado: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pendiente' },
    
    actividadId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'agenda',
            key: 'id'
        }
    }
}, {
    tableName: 'correos',
    timestamps: true
});

const Agenda = require('./agenda.model'); 
Correo.belongsTo(Agenda, { foreignKey: 'actividadId', as: 'actividad' });
Agenda.hasMany(Correo, { foreignKey: 'actividadId', as: 'suscriptores' });

module.exports = Correo;