// services/payoutService.js
const User = require('../models/user');
const Task = require('../models/task');
const {
  createOrGetContact,
  createFundAccountForUPI,
  createPayout
} = require('./razorpayService');

async function ensureContactAndFundAccount(user) {
  // user: mongoose doc
  if (user.payout && user.payout.razorpay_contact_id && user.payout.razorpay_fund_account_id) {
    return {
      contact_id: user.payout.razorpay_contact_id,
      fund_account_id: user.payout.razorpay_fund_account_id
    };
  }

  if (!user.payout || !user.payout.upiId) {
    throw new Error('Freelancer has not provided UPI details');
  }

  // create contact
  const contactResp = await createOrGetContact({
    name: user.name || (user.email ? user.email.split('@')[0] : 'Freelancer'),
    email: user.email,
    contact: user.phone || undefined,
    type: 'employee',
    reference_id: `user_${user._id}`
  });

  const contact_id = contactResp.id || contactResp.contact_id || contactResp.data?.id || contactResp.id;

  // create fund account for UPI
  const fundResp = await createFundAccountForUPI({
    contact_id,
    upi: user.payout.upiId
  });

  const fund_account_id = fundResp.id || fundResp.data?.id;

  // persist in user doc
  user.payout = user.payout || {};
  user.payout.razorpay_contact_id = contact_id;
  user.payout.razorpay_fund_account_id = fund_account_id;
  await user.save();

  return { contact_id, fund_account_id };
}

async function payoutToFreelancer({ taskId, triggeredBy = 'manual' }) {
  // Load Task + assignedTo
  const task = await Task.findById(taskId).populate('assignedTo').populate('uploader');
  if (!task) throw new Error('Task not found');

  // Safety & idempotency checks
  if (task.payment?.payoutDone) {
    throw new Error('Payout already done for this task');
  }
  if (task.status !== 'completed' && task.status !== 'submitted') {
    // allow payout only when accepted or auto job triggers on submitted after 72h. However acceptance sets completed before calling us.
    // We'll enforce completed in controller; here be defensive but allow submitted->autoPayout job to call (it will set status to completed after success)
    // For explicitness, we'll check assignedTo exists
    if (!task.assignedTo) throw new Error('No freelancer assigned for payout');
  }

  // compute amounts
  const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT || 10);
  const amount = task.payment?.amount ?? task.budget; // rupees
  const platformFeeAmount = +( (amount * platformFeePercent) / 100 ).toFixed(2);
  const netPayoutAmount = +(amount - platformFeeAmount).toFixed(2);

  // ensure contact & fund account
  const freelancer = task.assignedTo;
  if (!freelancer) throw new Error('No assigned freelancer');

  const { fund_account_id } = await ensureContactAndFundAccount(freelancer);

  // create payout
  const narration = `Payout for task ${task._id}`;
  const payoutResp = await createPayout({
    amountRupees: netPayoutAmount,
    fund_account_id,
    narration,
    reference_id: `task_${task._id}`
  });

  // update task payment
  task.payment = task.payment || {};
  task.payment.platformFeePercent = platformFeePercent;
  task.payment.platformFeeAmount = platformFeeAmount;
  task.payment.netPayoutAmount = netPayoutAmount;
  task.payment.payoutId = payoutResp.id || payoutResp.data?.id || payoutResp.payout_id;
  task.payment.payoutDone = true;
  if (triggeredBy === 'auto') {
    task.status = 'completed';
  } else {
    task.status = 'completed';
  }
  await task.save();

  // return payout response
  return { payoutResp, task };
}

module.exports = {
  payoutToFreelancer
};
