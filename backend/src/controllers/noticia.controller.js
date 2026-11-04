const { Op, UniqueConstraintError, ValidationError } = require('sequelize');
const Noticia = require('../models/noticia.model');

const noticiaCtrl = {};

noticiaCtrl.obtenerNoticias = async (req, res) => {
    try {
        const incluirBorradores = req.query.incluirBorradores === 'true';
        const where = incluirBorradores ? {} : { vigente: true };
        const noticias = await Noticia.findAll({
            where,
            order: [['fecha', 'DESC']]
        });
        res.status(200).json({ success: true, data: noticias, message: 'Noticias obtenidas con éxito' });
    } catch (error) {
        console.error('Error al obtener noticias:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener las noticias.' });
    }
};

noticiaCtrl.obtenerNoticiaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const noticia = await Noticia.findByPk(id);
        if (!noticia) {
            return res.status(404).json({ success: false, data: null, message: 'Noticia no encontrada.' });
        }
        res.status(200).json({ success: true, data: noticia, message: 'Noticia obtenida con éxito' });
    } catch (error) {
        console.error('Error al obtener noticia:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener la noticia.' });
    }
};

noticiaCtrl.crearNoticia = async (req, res) => {
    try {
        const { slug, titulo, categoria, descripcion, imagen, fecha, vigente, isLarge, displaySize } = req.body;

        if (!slug || !titulo || !categoria || !descripcion || !fecha) {
            return res.status(400).json({ success: false, data: null, message: 'Faltan campos obligatorios (slug, titulo, categoria, descripcion, fecha).' });
        }

        const existe = await Noticia.findOne({ where: { slug } });
        if (existe) {
            return res.status(409).json({ success: false, data: null, message: `El slug "${slug}" ya está en uso por otra noticia. Elegí otro o editá la existente.` });
        }

        const noticia = await Noticia.create({
            slug,
            titulo,
            categoria,
            descripcion,
            imagen: imagen ?? null,
            fecha,
            vigente: vigente !== false,
            isLarge: isLarge === true || displaySize === 'large'
        });
        return res.status(201).json({ success: true, data: noticia, message: 'Noticia creada con éxito' });
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            console.error('Error al crear noticia (slug duplicado):', error.errors?.[0]?.message || error.message);
            return res.status(409).json({ success: false, data: null, message: 'El slug ingresado ya existe. Elegí otro.' });
        }
        if (error instanceof ValidationError) {
            console.error('Error de validación al crear noticia:', error.message);
            return res.status(400).json({ success: false, data: null, message: error.errors?.map(e => e.message).join(' ') || 'Datos inválidos.' });
        }
        console.error('Error al crear noticia:', error);
        console.error('  Detalle:', error.original?.detail || error.original?.message || error.message);
        return res.status(500).json({ success: false, data: null, message: 'Error al crear la noticia.' });
    }
};

noticiaCtrl.actualizarNoticia = async (req, res) => {
    try {
        const { id } = req.params;
        const noticia = await Noticia.findByPk(id);
        if (!noticia) {
            return res.status(404).json({ success: false, data: null, message: 'Noticia no encontrada.' });
        }

        const { slug } = req.body;
        if (slug && slug !== noticia.slug) {
            const existe = await Noticia.findOne({ where: { slug, id: { [Op.ne]: id } } });
            if (existe) {
                return res.status(409).json({ success: false, data: null, message: `El slug "${slug}" ya está en uso por otra noticia.` });
            }
        }

        const updateData = { ...req.body };
        if (updateData.displaySize !== undefined && updateData.isLarge === undefined) {
            updateData.isLarge = updateData.displaySize === 'large';
        }

        await noticia.update(updateData);
        return res.status(200).json({ success: true, data: noticia, message: 'Noticia actualizada con éxito' });
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            console.error('Error al actualizar noticia (slug duplicado):', error.errors?.[0]?.message || error.message);
            return res.status(409).json({ success: false, data: null, message: 'El slug ya está en uso por otra noticia.' });
        }
        if (error instanceof ValidationError) {
            console.error('Error de validación al actualizar noticia:', error.message);
            return res.status(400).json({ success: false, data: null, message: error.errors?.map(e => e.message).join(' ') || 'Datos inválidos.' });
        }
        console.error('Error al actualizar noticia:', error);
        console.error('  Detalle:', error.original?.detail || error.original?.message || error.message);
        return res.status(500).json({ success: false, data: null, message: 'Error al actualizar la noticia.' });
    }
};

noticiaCtrl.eliminarNoticia = async (req, res) => {
    try {
        const { id } = req.params;
        const noticia = await Noticia.findByPk(id);
        if (!noticia) {
            return res.status(404).json({ success: false, data: null, message: 'Noticia no encontrada.' });
        }
        await noticia.destroy();
        res.status(200).json({ success: true, data: null, message: 'Noticia eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar noticia:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al eliminar la noticia.' });
    }
};

module.exports = noticiaCtrl;