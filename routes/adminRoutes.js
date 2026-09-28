const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken, requireRole(['ADMIN']));

router.get('/cashbox', adminController.getCashbox);
router.post('/cashbox/collect', adminController.collectCash);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/rates', adminController.getExchangeRates);

module.exports = router;
