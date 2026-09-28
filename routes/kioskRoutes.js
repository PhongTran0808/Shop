const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');
const { handleIdempotency } = require('../middleware/idempotency');

router.get('/menu', kioskController.getMenu);
router.post('/order', handleIdempotency, kioskController.createOrder);
router.post('/cancel', kioskController.cancelSession);

module.exports = router;
