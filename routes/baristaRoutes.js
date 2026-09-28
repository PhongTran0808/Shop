const express = require('express');
const router = express.Router();
const baristaController = require('../controllers/baristaController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken, requireRole(['BARISTA', 'ADMIN']));

router.get('/orders', baristaController.getOrders);
router.put('/orders/:id/status', baristaController.updateOrderStatus);

module.exports = router;
