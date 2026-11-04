const { Router } = require('express');
const router = Router();
const agendaCtrl = require('../controllers/agenda.controller');
const auditMiddleware = require('../middlewares/audit.middleware'); 
const { verificarRole } = require('../middlewares/auth.middleware');

router.get('/', agendaCtrl.obtenerAgenda);
router.get('/:id', agendaCtrl.obtenerActividadPorId);
router.post('/', verificarRole, auditMiddleware('Agenda'), agendaCtrl.crearActividad);
router.put('/:id', verificarRole, auditMiddleware('Agenda'), agendaCtrl.actualizarActividad);
router.delete('/:id', verificarRole, auditMiddleware('Agenda'), agendaCtrl.eliminarActividad);

module.exports = router;