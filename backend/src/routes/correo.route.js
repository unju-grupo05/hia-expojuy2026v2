const { Router } = require('express');
const router = Router();
const correoCtrl = require('../controllers/correo.controller');
const { publicPostLimiter } = require('../middlewares/rate-limit.middleware');

router.post('/', publicPostLimiter, correoCtrl.enviarCorreo);

module.exports = router;