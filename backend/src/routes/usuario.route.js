const express = require('express');
const router = express.Router();
const usuarioCtrl = require('../controllers/usuario.controller');
const { verificarRole } = require('../middlewares/auth.middleware');
const auditMiddleware = require('../middlewares/audit.middleware');
const { loginLimiter } = require('../middlewares/rate-limit.middleware');

router.post('/login', loginLimiter, usuarioCtrl.login);
router.post('/login-verificacion', loginLimiter, usuarioCtrl.loginVerificacion);

router.post('/registro', verificarRole, auditMiddleware('Usuarios'), usuarioCtrl.registrarUsuario);

module.exports = router;
