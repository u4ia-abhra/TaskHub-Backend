// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/authMiddleware'); // your auth

// Create an order (uploader selects freelancer & requests payment order)
router.post('/create-order', authMiddleware, paymentController.createOrderForTask);

module.exports = router;
