const { Router } = require('express');
const router = Router();
const ubicacionStandCtrl = require('../controllers/ubicacionStand.controller');
const auditMiddleware = require('../middlewares/audit.middleware');
const { verificarRole } = require('../middlewares/auth.middleware');

router.get('/', ubicacionStandCtrl.obtenerUbicaciones);
router.get('/:standId', ubicacionStandCtrl.obtenerUbicacionPorStand);

router.put('/:standId', verificarRole, auditMiddleware('UbicacionStand'), ubicacionStandCtrl.actualizarUbicacion);

module.exports = router;
