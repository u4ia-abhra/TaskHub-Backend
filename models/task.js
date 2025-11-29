const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        "assignment",
        "lab file",
        "workshop file",
        "presentation slide",
        "other",
      ],
      required: true,
      trim: true,
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
      enum: ["open", "in progress", "completed"],
      default: "open",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);