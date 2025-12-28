// controllers/webhookController.js
const Task = require('../models/task');
const User = require('../models/user');
const { verifyRazorpaySignature } = require('../utils/razorpayVerify');
const { fetchPayment } = require('../services/razorpayService');

// This route must be mounted with raw body preserved (see server.js changes)
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const rawBody = req.body.toString('utf8');
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!verifyRazorpaySignature(rawBody, signature, secret)) {
      return res.status(400).send('Invalid signature');
    }

    const payload = req.body;

    // Handle payment.captured
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      // find task by orderId
      const task = await Task.findOne({ 'payment.orderId': orderId });
      if (!task) {
        console.warn('Webhook: task not found for orderId', orderId);
        return res.json({ ok: true });
      }

      // Idempotent: if already recorded paymentId, skip
      if (task.payment && task.payment.paymentId) {
        return res.json({ ok: true, message: 'payment already recorded' });
      }

      // Assign task to pendingAssignedTo
      if (task.payment && task.payment.pendingAssignedTo) {
        task.assignedTo = task.payment.pendingAssignedTo;
      }

      // compute fees if available
      const razorpayFeePaise = (payment.fee || 0); // some payloads include fees
      const razorpayFee = +(razorpayFeePaise / 100).toFixed(2);

      // set chatEnabled, status and payment fields
      task.payment.paymentId = payment.id;
      task.payment.amount = (payment.amount / 100); // rupees
      task.payment.razorpayFee = razorpayFee;
      task.payment.platformFeePercent = task.payment.platformFeePercent || Number(process.env.PLATFORM_FEE_PERCENT || 10);
      task.payment.platformFeeAmount = +( (task.payment.amount * task.payment.platformFeePercent) / 100 ).toFixed(2);
      task.payment.netPayoutAmount = +(task.payment.amount - task.payment.platformFeeAmount).toFixed(2);
      task.payment.paidAt = new Date(payment.created_at * 1000);
      task.payment.chatEnabled = true;

      task.status = 'in_progress';

      await task.save();

      return res.json({ ok: true });
    }

    if (payload.event === 'payment.failed') {
      // Optionally handle payment failed (mark task still open, notify uploader)
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const task = await Task.findOne({ 'payment.orderId': orderId });
      if (task) {
        // clear pending assignment
        task.payment = task.payment || {};
        task.payment.paymentId = task.payment.paymentId || null;
        task.payment.chatEnabled = false;
        await task.save();
      }
      return res.json({ ok: true });
    }

    // For other events, just ack
    return res.json({ ok: true, received: payload.event });
  } catch (err) {
    console.error('webhook error', err);
    return res.status(500).send('Server error');
  }
};
