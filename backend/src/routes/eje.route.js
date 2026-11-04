const { Router } = require('express');
const router = Router();
const ejeCtrl = require('../controllers/eje.controller');
const { verificarRole } = require('../middlewares/auth.middleware');
const auditMiddleware = require('../middlewares/audit.middleware'); 

router.get('/', ejeCtrl.obtenerEjes);
router.post('/', verificarRole, auditMiddleware('Ejes'), ejeCtrl.crearEje);
router.put('/:id', verificarRole, auditMiddleware('Ejes'), ejeCtrl.actualizarEje);
router.delete('/:id', verificarRole, auditMiddleware('Ejes'), ejeCtrl.eliminarEje);

module.exports = router;