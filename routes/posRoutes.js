const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleIdempotency } = require('../middleware/idempotency');

router.use(authenticateToken, requireRole(['POS', 'ADMIN']));

router.post('/scan', posController.scanQr);
router.post('/pay', handleIdempotency, posController.payWithPass);

module.exports = router;
