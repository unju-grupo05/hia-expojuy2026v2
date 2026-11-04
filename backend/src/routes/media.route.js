const { Router } = require('express');
const router = Router();
const mediaCtrl = require('../controllers/media.controller');
const { uploadSingleImage, optimizeToWebp } = require('../middlewares/upload.middleware');
const auditMiddleware = require('../middlewares/audit.middleware');
const { verificarRole } = require('../middlewares/auth.middleware');

/**
 * @route   
 * @desc    
 * @access  
 */
router.post(
    '/upload',
    verificarRole,
    uploadSingleImage,
    optimizeToWebp,
    auditMiddleware('Media'),
    mediaCtrl.subirImagen
);

/**
 * @route  
 * @desc    
 * @access  
 */
router.post(
    '/',
    verificarRole,
    uploadSingleImage,
    optimizeToWebp,
    auditMiddleware('Media'),
    mediaCtrl.subirImagen
);

/**
 * @route   
 * @desc    
 * @access  
 */
router.get('/', mediaCtrl.obtenerTodas);

/**
 * @route   
 * @desc    
 * @access  
 */
router.delete(
    '/:id',
    verificarRole,
    auditMiddleware('Media'),
    mediaCtrl.eliminarImagen
);

module.exports = router;
