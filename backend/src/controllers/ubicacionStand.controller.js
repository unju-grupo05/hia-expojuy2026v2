const UbicacionStand = require('../models/ubicacionStand.model');
const Stand = require('../models/stand.model');

const ubicacionStandCtrl = {};

ubicacionStandCtrl.obtenerUbicaciones = async (req, res) => {
    try {
        const ubicaciones = await UbicacionStand.findAll({
            order: [['standId', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: ubicaciones,
            message: 'Ubicaciones 3D obtenidas con éxito'
        });
    } catch (error) {
        console.error('Error al obtener ubicaciones 3D:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al obtener las ubicaciones de los stands.'
        });
    }
};

ubicacionStandCtrl.obtenerUbicacionPorStand = async (req, res) => {
    try {
        const { standId } = req.params;
        const ubicacion = await UbicacionStand.findOne({
            where: { standId }
        });

        if (!ubicacion) {
            return res.status(404).json({
                success: false,
                data: null,
                message: `Ubicación espacial para el stand '${standId}' no encontrada.`
            });
        }

        res.status(200).json({
            success: true,
            data: ubicacion,
            message: 'Ubicación 3D obtenida con éxito'
        });
    } catch (error) {
        console.error('Error al obtener ubicación por standId:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al obtener la ubicación del stand.'
        });
    }
};

ubicacionStandCtrl.actualizarUbicacion = async (req, res) => {
    try {
        const { standId } = req.params;
        const ubicacion = await UbicacionStand.findOne({
            where: { standId }
        });

        if (!ubicacion) {
            return res.status(404).json({
                success: false,
                data: null,
                message: `Ubicación espacial para el stand '${standId}' no encontrada.`
            });
        }

        const { x, y, z, rotY, w, l, h, carpetColor, type } = req.body;
        const updateData = {};
        if (x !== undefined) updateData.x = parseFloat(x);
        if (y !== undefined) updateData.y = parseFloat(y);
        if (z !== undefined) updateData.z = parseFloat(z);
        if (rotY !== undefined) updateData.rotY = parseFloat(rotY);
        if (w !== undefined) updateData.w = parseFloat(w);
        if (l !== undefined) updateData.l = parseFloat(l);
        if (h !== undefined) updateData.h = parseFloat(h);
        if (carpetColor !== undefined) updateData.carpetColor = parseInt(carpetColor, 10);
        if (type !== undefined) updateData.type = type;

        await ubicacion.update(updateData);

        res.status(200).json({
            success: true,
            data: ubicacion,
            message: 'Ubicación 3D actualizada con éxito'
        });
    } catch (error) {
        console.error('Error al actualizar ubicación espacial:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error al actualizar la ubicación espacial del stand.'
        });
    }
};

module.exports = ubicacionStandCtrl;
