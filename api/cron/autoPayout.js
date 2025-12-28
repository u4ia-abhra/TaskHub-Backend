import mongoose from "mongoose";
import Task from "../../models/task.js";
import { payoutToFreelancer } from "../../services/payoutService.js";

export default async function handler(req, res) {
  try {
    // Safety: env check
    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL not found");
    }

    // Connect Mongo (serverless-safe)
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URL);
    }

    const threshold = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const candidates = await Task.find({
      status: "submitted",
      firstSubmissionAt: { $lte: threshold },
      "payment.payoutDone": { $ne: true },
      "payment.paymentId": { $exists: true },
      assignedTo: { $exists: true },
    }).select("_id");

    let processed = 0;

    for (const { _id } of candidates) {
      try {
        // Atomic lock
        const locked = await Task.findOneAndUpdate(
          {
            _id,
            "payment.payoutDone": { $ne: true },
            "payment.payoutInProgress": { $ne: true },
          },
          { $set: { "payment.payoutInProgress": true } },
          { new: true }
        );

        if (!locked) continue;

        await payoutToFreelancer({
          taskId: _id,
          triggeredBy: "auto",
        });

        processed++;
      } catch (err) {
        // Release lock so it can retry next hour
        await Task.updateOne(
          { _id },
          { $unset: { "payment.payoutInProgress": "" } }
        );
      }
    }

    return res.status(200).json({
      ok: true,
      processed,
    });
  } catch (err) {
    console.error("autoPayout failed:", err);
    return res.status(500).json({ error: "Auto payout failed" });
  }
}
