const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true, // used to delete from Cloudinary
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true, // in bytes
    },
    resourceType: {
      type: String, // e.g. "image", "raw", "video"
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    orderId: String,
    paymentId: String,
    amount: Number, // in paise OR rupees? we'll store in INR rupees (number) and paise when interacting with Razorpay
    platformFeePercent: Number,
    platformFeeAmount: Number, // in rupees
    razorpayFee: Number, // in rupees (if available)
    netPayoutAmount: Number, // in rupees
    paidAt: Date,
    payoutId: String,
    payoutDone: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: false },
    pendingAssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // set at order creation so webhook can assign
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "assignment",
        "lab file",
        "workshop file",
        "presentation slide",
        "other",
      ],
    },
    deadline: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Deadline must be a future date",
      },
    },
    budget: {
      type: Number,
      required: true,
      min: [10, "Budget must be at least 10"],
    },
    status: {
      type: String,
      enum: [
        "open",
        "in progress",
        "completed",
        "submitted",
        "revision_limit_reached",
      ],
      default: "open",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    revisionRequestsUsed: {
      type: Number,
      default: 0,
    },
    maxRevisionRequests: {
      type: Number,
      default: 3,
    },
    payment: paymentSchema,

    // to track submissions timestamps for auto-payout logic
    firstSubmissionAt: Date,
    revisionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;
