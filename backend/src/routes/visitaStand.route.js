const { Router } = require('express');
const router = Router();
const visitaStandCtrl = require('../controllers/visitaStand.controller');

// Registro de eventos de telemetría (público: mapa 3D, tótems, web)
router.post('/', visitaStandCtrl.registrarVisita);

// Consultas analíticas y de métricas
router.get('/ranking', visitaStandCtrl.obtenerRanking);
router.get('/metricas-eje', visitaStandCtrl.obtenerMetricasPorEje);
router.get('/mapa-calor', visitaStandCtrl.obtenerMapaCalor);

module.exports = router;
