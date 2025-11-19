const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// Public route - get payment options
router.get('/options', PaymentController.getPaymentOptions);

// Protected routes
router.post('/initialize', auth, PaymentController.initializePayment);
router.post('/verify', auth, PaymentController.verifyPayment);
router.get('/status', auth, PaymentController.getPaymentStatus);

// Admin routes
router.post('/admin/verify', auth, PaymentController.adminVerifyPayment);

module.exports = router;