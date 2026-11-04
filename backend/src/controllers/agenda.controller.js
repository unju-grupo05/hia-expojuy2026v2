const Agenda = require('../models/agenda.model');

const agendaCtrl = {};

agendaCtrl.obtenerAgenda = async (req, res) => {
    try {
        const { dia } = req.query;
        const where = dia ? { dia } : {};
        const items = await Agenda.findAll({
            where,
            order: [['dia', 'ASC'], ['orden', 'ASC'], ['horaInicio', 'ASC']]
        });
        res.status(200).json({ success: true, data: items, message: 'Agenda obtenida con éxito' });
    } catch (error) {
        console.error('Error al obtener agenda:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener la agenda.' });
    }
};

agendaCtrl.obtenerActividadPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Agenda.findByPk(id);
        if (!item) {
            return res.status(404).json({ success: false, data: null, message: 'Actividad no encontrada.' });
        }
        res.status(200).json({ success: true, data: item, message: 'Actividad obtenida con éxito' });
    } catch (error) {
        console.error('Error al obtener actividad:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al obtener la actividad.' });
    }
};

agendaCtrl.crearActividad = async (req, res) => {
    try {
        const { dia, horaInicio, horaFin, titulo } = req.body;
        if (!dia || !horaInicio || !horaFin || !titulo) {
            return res.status(400).json({ success: false, data: null, message: 'Faltan campos obligatorios (dia, horaInicio, horaFin, titulo).' });
        }
        const item = await Agenda.create(req.body);
        res.status(201).json({ success: true, data: item, message: 'Actividad creada con éxito' });
    } catch (error) {
        console.error('Error al crear actividad:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al crear la actividad.' });
    }
};

agendaCtrl.actualizarActividad = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Agenda.findByPk(id);
        if (!item) {
            return res.status(404).json({ success: false, data: null, message: 'Actividad no encontrada.' });
        }
        await item.update(req.body);
        res.status(200).json({ success: true, data: item, message: 'Actividad actualizada con éxito' });
    } catch (error) {
        console.error('Error al actualizar actividad:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al actualizar la actividad.' });
    }
};

agendaCtrl.eliminarActividad = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Agenda.findByPk(id);
        if (!item) {
            return res.status(404).json({ success: false, data: null, message: 'Actividad no encontrada.' });
        }
        await item.destroy();
        res.status(200).json({ success: true, data: null, message: 'Actividad eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar actividad:', error);
        res.status(500).json({ success: false, data: null, message: 'Error al eliminar la actividad.' });
    }
};

module.exports = agendaCtrl;