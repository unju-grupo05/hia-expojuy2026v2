const { Router } = require('express');
const router = Router();
const expositorCtrl = require('../controllers/expositor.controller');
const auditMiddleware = require('../middlewares/audit.middleware');
const { verificarRole } = require('../middlewares/auth.middleware');
const { uploadSingleImage, optimizeLogoToWebp } = require('../middlewares/upload.middleware');

router.get('/', expositorCtrl.obtenerExpositores);
router.get('/:id', expositorCtrl.obtenerExpositorPorId);

/**
 * @route   
 * @desc    
 *          
 * @access  
 */
router.post(
    '/logo',
    verificarRole,
    uploadSingleImage,
    optimizeLogoToWebp,
    auditMiddleware('Expositor'),
    expositorCtrl.subirLogo
);

/**
 * @route   
 * @desc    
 * @access
 */
router.post(
    '/:id/logo',
    verificarRole,
    uploadSingleImage,
    optimizeLogoToWebp,
    auditMiddleware('Expositor'),
    expositorCtrl.subirLogo
);

router.post('/', verificarRole, auditMiddleware('Expositor'), expositorCtrl.crearExpositor);
router.put('/:id', verificarRole, auditMiddleware('Expositor'), expositorCtrl.actualizarExpositor);
router.delete('/:id', verificarRole, auditMiddleware('Expositor'), expositorCtrl.eliminarExpositor);

module.exports = router;