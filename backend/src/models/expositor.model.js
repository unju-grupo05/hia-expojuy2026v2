const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Expositor = sequelize.define('Expositor', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    stand: { type: DataTypes.STRING, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    origin: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING(254), allowNull: true },
    logo: { type: DataTypes.STRING(255), allowNull: true }
}, {
    tableName: 'expositores',
    timestamps: true
});

module.exports = Expositor;