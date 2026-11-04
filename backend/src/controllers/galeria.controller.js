const Galeria = require('../models/galeria.model');

const galeriaCtrl = {};

galeriaCtrl.obtenerGaleria = async (req, res) => {
    try {
        const items = await Galeria.findAll({ order: [['orden', 'ASC'], ['id', 'ASC']] });
        res.status(200).json({ success: true, data: items, message: 'Galería obtenida con éxito' });
    } catch (error) {
        console.error('Error al obtener galería:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener la galería.' });
    }
};

galeriaCtrl.crearItem = async (req, res) => {
    try {
        const { titulo, descripcion, imagen, seccion, orden } = req.body;
        if (!titulo || !imagen) {
            return res.status(400).json({ success: false, data: null, message: 'Faltan campos obligatorios (titulo, imagen).' });
        }
        const item = await Galeria.create({ titulo, descripcion, imagen, seccion, orden });
        res.status(201).json({ success: true, data: item, message: 'Imagen agregada a la galería con éxito' });
    } catch (error) {
        console.error('Error al crear ítem de galería:', error?.original?.detail || error);
        res.status(500).json({ success: false, data: null, message: 'Error al crear el ítem de galería.' });
    }
};

galeriaCtrl.actualizarItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Galeria.findByPk(id);
        if (!item) {
            return res.status(404).json({ success: false, data: null, message: 'Ítem de galería no encontrado.' });
        }
        await item.update(req.body);
        res.status(200).json({ success: true, data: item, message: 'Ítem de galería actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar ítem de galería:', error?.original?.detail || error);
        res.status(500).json({ success: false, data: null, message: 'Error al actualizar el ítem de galería.' });
    }
};

galeriaCtrl.eliminarItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Galeria.findByPk(id);
        if (!item) {
            return res.status(404).json({ success: false, data: null, message: 'Ítem de galería no encontrado.' });
        }
        await item.destroy();
        res.status(200).json({ success: true, data: null, message: 'Ítem de galería eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar ítem de galería:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al eliminar el ítem de galería.' });
    }
};

module.exports = galeriaCtrl;