const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    version: {
      type: Number,
      required: true,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["submitted", "revision_requested", "accepted"],
      default: "submitted",
      index: true,
    },
  },
  { timestamps: true }
);

/**
 * Prevent duplicate version numbers for the same task
 * (v1, v2, v3 … must be unique per task)
 */
submissionSchema.index(
  { task: 1, version: 1 },
  { unique: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
