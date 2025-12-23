const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ], // [task.uploadedBy, application.applicant]

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },

    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);