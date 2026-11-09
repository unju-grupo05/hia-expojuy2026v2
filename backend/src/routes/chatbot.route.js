const { Router } = require('express');
const chatbotCtrl = require('../controllers/chatbot.controller');
const { chatbotLimiter } = require('../middlewares/rate-limit.middleware');

const router = Router();

router.post('/query', chatbotLimiter, chatbotCtrl.consultar);
router.get('/search', chatbotLimiter, chatbotCtrl.buscar);
router.get('/sugerencias', chatbotCtrl.sugerencias);
router.patch('/logs/:id/feedback', chatbotCtrl.registrarFeedback);
router.get('/analitica', chatbotCtrl.obtenerAnalitica);

module.exports = router;