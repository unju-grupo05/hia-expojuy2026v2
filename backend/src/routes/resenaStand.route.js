const { Router } = require('express');
const router = Router();
const resenaStandCtrl = require('../controllers/resenaStand.controller');

// Rutas públicas y de consulta
router.post('/', resenaStandCtrl.crearResena);
router.get('/stand/:standId', resenaStandCtrl.obtenerResenasPorStand);
router.get('/usuario/:usuarioId', resenaStandCtrl.obtenerResenasPorUsuario);

module.exports = router;
