const { Router } = require('express');
const router = Router();
const asistenciaAgendaCtrl = require('../controllers/asistenciaAgenda.controller');

router.post('/', asistenciaAgendaCtrl.inscribir);
router.patch('/:id/estado', asistenciaAgendaCtrl.actualizarEstado);
router.get('/usuario/:usuarioId', asistenciaAgendaCtrl.obtenerPorUsuario);
router.get('/agenda/:agendaId', asistenciaAgendaCtrl.obtenerPorAgenda);

module.exports = router;
