const Submission = require("../models/submission");
const Task = require("../models/task");
const { uploadFile, deleteFile } = require("../utils/cloudinaryService");
const { payoutToFreelancer } = require("../services/payoutService");
const sendTaskSubmissionEmail = require("../utils/emails/sendTaskSubmissionEmail");
const sendSubmissionDecisionEmail = require("../utils/emails/sendSubmissionDecisionEmail");
const Conversation = require("../models/conversation");
const sendChatClosureThankYouEmail = require("../utils/emails/sendChatClosureThankYouEmail");
const User = require("../models/user");

async function createSubmission(req, res) {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const { message } = req.body;

    const task = await Task.findById(taskId).populate(
      "uploadedBy",
      "name email"
    );
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

    if (task.status !== "in_progress" && task.status !== "in progress") {
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

    console.log("email details:", {
      uploaderEmail: task.uploadedBy.email,
      uploaderName: task.uploadedBy.name,
    });
    
    const freelancer = await User.findById(userId).select("name");

    try {
      Response = await sendTaskSubmissionEmail({
        uploaderEmail: task.uploadedBy.email,
        uploaderName: task.uploadedBy.name,
        freelancerName: freelancer.name,
        taskTitle: task.title,
        taskId: task._id,
        version: submission.version,
      });
      console.log("Submission email sent:", Response);
    } catch (error) {
      console.error("Submission email failed:", error.message);
    }

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

    const submission = await Submission.findById(id)
      .populate("task")
      .populate("freelancer", "name email");
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const task = await Task.findById(submission.task._id);

    if (task.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        message: "Only the task uploader can accept submissions.",
      });
    }

    // 🚫 SAFETY: prevent double acceptance
    if (submission.status === "accepted") {
      return res.status(400).json({
        message: "This submission is already accepted.",
      });
    }

    // 1️⃣ Accept submission
    submission.status = "accepted";
    await submission.save();

    // 2️⃣ Mark task completed (MANDATORY before payout)
    task.status = "completed";
    // await task.save();

    // Send acceptance email to freelancer
    try {
      Response = await sendSubmissionDecisionEmail({
        freelancerEmail: submission.freelancer.email,
        freelancerName: submission.freelancer.name,
        taskTitle: task.title,
        taskId: task._id,
        decision: "accepted",
      });
      console.log("Email send response:", Response);
    } catch (error) {
      console.error("Submission accepted email failed:", error.message);
    }

    // Close active chat conversation related to the task
    try {
      const conversation = await Conversation.findOne({
        task: task._id,
        status: "active",
      }).populate("participants", "email");

      if (conversation) {
        conversation.status = "closed";
        await conversation.save();

        const uploader = conversation.participants.find(
          (p) => p._id.toString() === task.uploadedBy.toString()
        );

        const freelancer = conversation.participants.find(
          (p) => p._id.toString() !== task.uploadedBy.toString()
        );

        if (uploader && freelancer) {
          try {
            await sendChatClosureThankYouEmail({
              uploaderEmail: uploader.email,
              freelancerEmail: freelancer.email,
              taskTitle: task.title,
            });
          } catch (emailErr) {
            console.error("Chat closure email failed:", emailErr.message);
          }
        }
      }
    } catch (chatErr) {
      console.error("Chat closure failed:", chatErr.message);
    }

    // 3️⃣ 🔥 TRIGGER PAYOUT (ONLY PLACE)
    try {
      await payoutToFreelancer({
        taskId: task._id,
        triggeredBy: "accept",
      });
    } catch (payoutError) {
      /**
       * IMPORTANT:
       * - Do NOT rollback acceptance
       * - Money safety > UX
       * - This can be retried manually / via admin / cron
       */
      console.error("Payout failed after submission acceptance:", payoutError);
    }

    return res.status(200).json({
      message:
        "Submission accepted. Task completed and payout process initiated.",
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

    const submission = await Submission.findById(id)
      .populate("task")
      .populate("freelancer", "name email");
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

    try {
      await sendSubmissionDecisionEmail({
        freelancerEmail: submission.freelancer.email,
        freelancerName: submission.freelancer.name,
        taskTitle: task.title,
        taskId: task._id,
        decision: "revision_requested",
        revisionMessage: submission.revisionMessage,
      });
    } catch (error) {
      console.error("Revision request email failed:", error.message);
    }

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
