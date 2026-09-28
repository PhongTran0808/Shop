const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', loginLimiter, authController.login);
router.get('/verify', authenticateToken, authController.verify);
router.post('/logout', authController.logout);

module.exports = router;
