// controllers/paymentController.js
const Task = require('../models/task');
const { createOrder } = require('../services/razorpayService');

exports.createOrderForTask = async (req, res) => {
  try {
    const uploaderId = req.user.id; // assume auth middleware sets req.user
    const { taskId, freelancerId } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (String(task.uploader) !== String(uploaderId)) {
      return res.status(403).json({ message: 'Not authorized to pay for this task' });
    }

    if (task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open for payment' });
    }

    const amount = task.budget;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid task budget' });

    const platformFee = Number(process.env.PLATFORM_FEE_PERCENT || 10);

    // create razorpay order
    const receipt = `task_${task._id}_${Date.now()}`;
    const notes = { taskId: String(task._id), freelancerId: String(freelancerId), platformFeePercent: platformFee };

    const order = await createOrder({ amountRupees: amount, receipt, notes });

    // Save pendingAssignedTo so webhook can finalize assignment
    task.payment = task.payment || {};
    task.payment.orderId = order.id;
    task.payment.amount = amount; // rupees
    task.payment.platformFeePercent = platformFee;
    task.payment.pendingAssignedTo = freelancerId;
    await task.save();

    // Return order details (frontend will complete payment). But since you said "no frontend", the system still needs order id.
    return res.json({
      orderId: order.id,
      amount: order.amount, // paise
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('createOrder error', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
