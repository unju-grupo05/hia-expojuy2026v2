const { Router } = require('express');
const router = Router();
const noticiaCtrl = require('../controllers/noticia.controller');
const auditMiddleware = require('../middlewares/audit.middleware');
const { verificarRole } = require('../middlewares/auth.middleware');

router.get('/', noticiaCtrl.obtenerNoticias);
router.get('/:id', noticiaCtrl.obtenerNoticiaPorId);
router.post('/', verificarRole, auditMiddleware('Noticia'), noticiaCtrl.crearNoticia);
router.put('/:id', verificarRole, auditMiddleware('Noticia'), noticiaCtrl.actualizarNoticia);
router.delete('/:id', verificarRole, auditMiddleware('Noticia'), noticiaCtrl.eliminarNoticia);

module.exports = router;