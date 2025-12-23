const razorpay = require("../utils/razorpay");
const crypto = require("crypto");
const Task = require("../models/task");

exports.createPaymentOrder = async (req, res) => {
  try {
    const { taskId } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(taskId);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.createdBy.toString() !== userId)
      return res.status(403).json({ message: "Not authorized" });

    if (!task.selectedFreelancer)
      return res.status(400).json({ message: "Select freelancer first" });

    const amountInPaise = task.budget * 100;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `task_${task._id}`,
    });

    task.payment.orderId = order.id;
    task.payment.amount = task.budget;
    await task.save();

    res.status(200).json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: "Payment order failed" });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, taskId } = req.body;

    const body = orderId + "|" + paymentId;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature)
      return res.status(400).json({ message: "Invalid payment signature" });

    const task = await Task.findById(taskId);

    task.payment.paymentId = paymentId;
    task.payment.signature = signature;
    task.payment.status = "paid";
    task.status = "in_progress";

    await task.save();

    res.status(200).json({ message: "Payment verified, task started" });
  } catch (err) {
    res.status(500).json({ message: "Payment verification failed" });
  }
};
