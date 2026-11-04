const { Router } = require('express');
const reunionB2BCtrl = require('../controllers/reunionB2B.controller');
const { publicPostLimiter } = require('../middlewares/rate-limit.middleware');

const router = Router();

router.post('/', publicPostLimiter, reunionB2BCtrl.crear);

module.exports = router;
