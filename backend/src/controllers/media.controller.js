const Media = require('../models/media.model');
const fs = require('fs');
const path = require('path');

const mediaCtrl = {};


mediaCtrl.subirImagen = async (req, res) => {
    try {
        if (!req.processedFile) {
            return res.status(400).json({
                success: false,
                message: 'No se encontraron datos de la imagen procesada.'
            });
        }

        const { id, originalName, filename, url, mimeType, sizeBytes, format } = req.processedFile;

        // Persistir en PostgreSQL mediante Sequelize
        const media = await Media.create({
            id,
            originalName,
            filename,
            url,
            mimeType,
            sizeBytes
        });

        // Retornar respuesta limpia con estado 201
        return res.status(201).json({
            id: media.id,
            url: media.url,
            filename: media.filename,
            size: media.sizeBytes,
            format: format || 'webp'
        });
    } catch (error) {
        console.error('Error al persistir la imagen en PostgreSQL:', error);

        // Limpieza de seguridad: Si falló la BD, eliminamos el archivo físico generado
        if (req.processedFile && req.processedFile.path && fs.existsSync(req.processedFile.path)) {
            try {
                fs.unlinkSync(req.processedFile.path);
            } catch (unlinkErr) {
                console.error('Error al limpiar archivo físico huérfano:', unlinkErr);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Error al registrar la información de la imagen en la base de datos.',
            error: error?.original?.detail || error.message
        });
    }
};

mediaCtrl.obtenerTodas = async (req, res) => {
    try {
        const items = await Media.findAll({
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({
            success: true,
            data: items,
            message: 'Imágenes obtenidas exitosamente.'
        });
    } catch (error) {
        console.error('Error al listar imágenes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de imágenes.'
        });
    }
};

mediaCtrl.eliminarImagen = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await Media.findByPk(id);

        if (!media) {
            return res.status(404).json({
                success: false,
                message: 'La imagen solicitada no existe.'
            });
        }

        // Eliminar el archivo físico en disco si existe
        const filePath = path.resolve(__dirname, '../../uploads', media.filename);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                console.warn('Aviso: No se pudo borrar el archivo físico:', unlinkErr.message);
            }
        }

        await media.destroy();

        return res.status(200).json({
            success: true,
            message: 'Imagen eliminada exitosamente del servidor y de la base de datos.'
        });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar el registro de la imagen.'
        });
    }
};

module.exports = mediaCtrl;
