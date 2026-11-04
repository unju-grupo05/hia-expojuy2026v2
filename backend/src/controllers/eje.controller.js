const Eje = require('../models/eje.model');

const ejeCtrl = {};

ejeCtrl.obtenerEjes = async (req, res) => {
    try {
        const ejes = await Eje.findAll({ order: [['orden', 'ASC']] });
        res.status(200).json({ success: true, data: ejes, message: 'Ejes obtenidos con éxito' });
    } catch (error) {
        console.error('Error al obtener ejes:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener los ejes temáticos.' });
    }
};

ejeCtrl.crearEje = async (req, res) => {
    try {
        const { nombre, descripcion, icono, orden } = req.body;
        if (!nombre || !descripcion || !icono || !orden) {
            return res.status(400).json({ success: false, data: null, message: 'Faltan campos obligatorios (nombre, descripcion, icono, orden).' });
        }
        const eje = await Eje.create(req.body);
        res.status(201).json({ success: true, data: eje, message: 'Eje creado con éxito' });
    } catch (error) {
        console.error('Error al crear eje:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al crear el eje temático.' });
    }
};

ejeCtrl.actualizarEje = async (req, res) => {
    try {
        const { id } = req.params;
        const eje = await Eje.findByPk(id);
        if (!eje) {
            return res.status(404).json({ success: false, data: null, message: 'Eje no encontrado.' });
        }
        await eje.update(req.body);
        res.status(200).json({ success: true, data: eje, message: 'Eje actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar eje:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al actualizar el eje temático.' });
    }
};

ejeCtrl.eliminarEje = async (req, res) => {
    try {
        const { id } = req.params;
        const eje = await Eje.findByPk(id);
        if (!eje) {
            return res.status(404).json({ success: false, data: null, message: 'Eje no encontrado.' });
        }
        await eje.destroy();
        res.status(200).json({ success: true, data: null, message: 'Eje eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar eje:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al eliminar el eje temático.' });
    }
};

module.exports = ejeCtrl;