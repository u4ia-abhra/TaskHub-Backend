// routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook endpoint (no auth — must verify signature)
// IMPORTANT: must preserve raw body in server.js
router.post('/razorpay', express.raw({ type: '*/*' }), webhookController.handleRazorpayWebhook);

module.exports = router;
