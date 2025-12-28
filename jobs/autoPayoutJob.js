// jobs/autoPayoutJob.js
const cron = require('node-cron');
const mongoose = require("mongoose");
const Task = require('../models/task');
const { payoutToFreelancer } = require('../services/payoutService');

function startAutoPayoutJob() {
  cron.schedule('0 * * * *', async () => {
    console.log('[autoPayoutJob] tick @', new Date().toISOString());

     if (mongoose.connection.readyState !== 1) {
      console.log("[autoPayoutJob] DB not connected, skipping tick");
      return;
    }

    const threshold = new Date(Date.now() - 72 * 60 * 60 * 1000);

    try {
    // Step 1: find candidate task IDs only (cheap query)
    const candidates = await Task.find({
      status: 'submitted',
      firstSubmissionAt: { $lte: threshold },
      'payment.payoutDone': { $ne: true },
      'payment.paymentId': { $exists: true }, // payment captured
      assignedTo: { $exists: true }
    }).select('_id');

    for (const { _id } of candidates) {
      try {
        // Step 2: acquire atomic lock
        const lockedTask = await Task.findOneAndUpdate(
          {
            _id,
            'payment.payoutDone': { $ne: true },
            'payment.payoutInProgress': { $ne: true }
          },
          {
            $set: {
              'payment.payoutInProgress': true
            }
          },
          { new: true }
        );

        // If lock not acquired, skip
        if (!lockedTask) {
          continue;
        }

        console.log(`[autoPayoutJob] locked task ${_id}`);

        // Step 3: trigger payout
        await payoutToFreelancer({
          taskId: _id,
          triggeredBy: 'auto'
        });

        console.log(`[autoPayoutJob] payout success for task ${_id}`);
      } catch (err) {
        console.error('[autoPayoutJob] payout error for task', _id, err);

        // IMPORTANT: release lock so it can retry next run
        await Task.updateOne(
          { _id },
          { $unset: { 'payment.payoutInProgress': '' } }
          );
        }
      }
    }catch(err){
      console.error("[autoPayoutJob] job-level failure", err);
    }
  });

  console.log('[autoPayoutJob] scheduled (hourly)');
}

module.exports = startAutoPayoutJob;
