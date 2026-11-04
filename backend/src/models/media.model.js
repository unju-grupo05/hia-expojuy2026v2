const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Media = sequelize.define('Media', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    originalName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'image/webp'
    },
    sizeBytes: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'media',
    timestamps: true
});

module.exports = Media;
