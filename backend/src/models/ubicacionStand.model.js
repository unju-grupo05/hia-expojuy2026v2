const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const UbicacionStand = sequelize.define('UbicacionStand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    standId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'stand_id',
        references: {
            model: 'stands',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    x: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    y: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    z: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    rotY: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'rot_y'
    },
    w: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 3
    },
    l: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 3
    },
    h: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 2.5
    },
    carpetColor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0x334155,
        field: 'carpet_color'
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'cubierto'
    }
}, {
    tableName: 'ubicaciones_stand',
    timestamps: true
});

module.exports = UbicacionStand;
