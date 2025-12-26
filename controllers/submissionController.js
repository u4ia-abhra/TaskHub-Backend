const Submission = require("../models/submission");
const Task = require("../models/task");
const { uploadFile, deleteFile } = require("../utils/cloudinaryService");

async function createSubmission(req, res) {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const { message } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (task.status === "revision_limit_reached") {
      return res.status(403).json({
        message: "Revision limit reached. Awaiting uploader's final decision.",
      });
    }

    if (task.status === "submitted") {
      return res.status(403).json({
        message:
          "Please wait for the uploader to review the current submission.",
      });
    }

    if (task.status !== "in progress") {
      return res.status(400).json({
        message: "Submissions are allowed only when task is in progress.",
      });
    }

    if (!task.assignedTo || task.assignedTo.toString() !== userId) {
      return res.status(403).json({
        message: "Only the assigned freelancer can submit this task.",
      });
    }

    if (
      (!message || message.trim() === "") &&
      (!req.files || req.files.length === 0)
    ) {
      return res.status(400).json({
        message:
          "Submission must contain a message or at least one attachment.",
      });
    }

    const lastSubmission = await Submission.findOne({ task: taskId })
      .sort({ version: -1 })
      .select("version");

    const nextVersion = lastSubmission ? lastSubmission.version + 1 : 1;

    let attachments = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        attachments.push({
          url: result.url,
          publicId: result.publicId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
        });
      }
    }

    const submission = await Submission.create({
      task: taskId,
      freelancer: userId,
      version: nextVersion,
      message,
      attachments,
      status: "submitted",
    });

    task.status = "submitted";
    await task.save();

    res.status(201).json({
      message: `Submission v${nextVersion} created successfully.`,
      submission,
    });
  } catch (error) {
    console.error("Create submission error:", error);
    res.status(500).json({
      message: "Failed to create submission.",
      error: error.message,
    });
  }
}

async function getSubmissions(req, res) {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const isUploader = task.uploadedBy.toString() === userId;
    const isFreelancer = task.assignedTo?.toString() === userId;

    if (!isUploader && !isFreelancer) {
      return res.status(403).json({ message: "Not authorized." });
    }

    const submissions = await Submission.find({ task: taskId })
      .sort({ version: 1 })
      .populate("freelancer", "name image");

    res.status(200).json({
      submissions,
    });
  } catch (error) {
    console.error("Fetch submissions error:", error);
    res.status(500).json({
      message: "Failed to fetch submissions.",
      error: error.message,
    });
  }
}

async function acceptSubmission(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const submission = await Submission.findById(id).populate("task");
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const task = submission.task;

    if (task.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        message: "Only the task uploader can accept submissions.",
      });
    }

    submission.status = "accepted";
    await submission.save();

    task.status = "completed";
    await task.save();

    res.status(200).json({
      message: "Submission accepted. Task marked as completed.",
    });
  } catch (error) {
    console.error("Accept submission error:", error);
    res.status(500).json({
      message: "Failed to accept submission.",
      error: error.message,
    });
  }
}

async function requestRevision(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { message } = req.body;

    const submission = await Submission.findById(id).populate("task");
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const task = submission.task;    

    if (task.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        message: "Only the task uploader can request revisions.",
      });
    }

    // Revision limit reached
    if (task.revisionRequestsUsed >= task.maxRevisionRequests) {
      return res.status(403).json({
        message:
          "Maximum revision requests reached. Please accept the submission or raise a dispute.",
      });
    }
    
    // Revision can be requested only when task is in 'submitted' state
    if (task.status !== "submitted") {
      return res.status(400).json({
        message:
          "Revision can be requested only when the task is in submitted state.",
      });
    }

    // Increment revision count
    task.revisionRequestsUsed += 1;

    // Check if this was the LAST allowed revision
    if (task.revisionRequestsUsed >= task.maxRevisionRequests) {
      task.status = "revision_limit_reached";
    } else {
      task.status = "in progress";
    }

    submission.status = "revision_requested";

    if (message && message.trim() !== "") {
      submission.revisionMessage = message.trim();
    }

    await submission.save();
    await task.save();

    res.status(200).json({
      message: "Revision requested successfully.",
      revisionMessage: submission.revisionMessage,
      revisionsUsed: task.revisionRequestsUsed,
      revisionsRemaining: task.maxRevisionRequests - task.revisionRequestsUsed,
      taskStatus: task.status,
    });
  } catch (error) {
    console.error("Request revision error:", error);
    res.status(500).json({
      message: "Failed to request revision.",
      error: error.message,
    });
  }
}

module.exports = {
  createSubmission,
  getSubmissions,
  acceptSubmission,
  requestRevision,
};