const { Router } = require('express');
const router = Router();
const galeriaCtrl = require('../controllers/galeria.controller');
const auditMiddleware = require('../middlewares/audit.middleware');
const { verificarRole } = require('../middlewares/auth.middleware');

router.get('/', galeriaCtrl.obtenerGaleria);
router.post('/', verificarRole, auditMiddleware('Galería'), galeriaCtrl.crearItem);
router.put('/:id', verificarRole, auditMiddleware('Galería'), galeriaCtrl.actualizarItem);
router.delete('/:id', verificarRole, auditMiddleware('Galería'), galeriaCtrl.eliminarItem);

module.exports = router;