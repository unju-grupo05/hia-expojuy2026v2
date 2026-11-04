const { Router } = require('express');
const router = Router();
const standCtrl = require('../controllers/stand.controller');
const auditMiddleware = require('../middlewares/audit.middleware');
const { verificarRole } = require('../middlewares/auth.middleware');

// Rutas públicas (consumidas por Three.js, mapa 3D y catálogo)
router.get('/', standCtrl.obtenerStands);
router.get('/disponibles', standCtrl.obtenerStandsDisponibles);
router.get('/:id', standCtrl.obtenerStandPorId);

// Rutas protegidas para administración de stands y asignaciones comerciales
router.post('/', verificarRole, auditMiddleware('Stand'), standCtrl.crearStand);
router.put('/:id', verificarRole, auditMiddleware('Stand'), standCtrl.actualizarStand);
router.patch('/:id/asignar', verificarRole, auditMiddleware('Stand'), standCtrl.asignarExpositor);
router.delete('/:id', verificarRole, auditMiddleware('Stand'), standCtrl.eliminarStand);

module.exports = router;
