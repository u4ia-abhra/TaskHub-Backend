const Application = require("../models/application");
const Task = require("../models/task");
const Conversation = require("../models/conversation");

async function applyForTask(req, res) {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const { coverLetter, bidAmount, estimatedTime } = req.body;

    // Validate required fields
    if (!bidAmount || !estimatedTime) {
      return res.status(400).json({
        message: "Bid amount and estimated time are required.",
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (task.status !== "open") {
      return res
        .status(400)
        .json({ message: "Applications are closed for this task." });
    }

    if (task.uploadedBy.toString() === userId) {
      return res
        .status(403)
        .json({ message: "You cannot apply for your own task." });
    }

    const existing = await Application.findOne({
      task: taskId,
      applicant: userId,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You have already applied for this task." });
    }

    const application = new Application({
      task: taskId,
      applicant: userId,
      coverLetter,
      bidAmount,
      estimatedTime,
    });

    await application.save();

    res.status(201).json({ message: "Application submitted successfully." });
  } catch (error) {
    console.error("Error applying for task:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function getApplicationsForTask(req, res) {
  try {
    const taskId = req.params.taskId;
    const userId = req.user.id;

    // Check if the task exists and belongs to this user
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (task.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({
          message: "You are not authorized to view applications for this task.",
        });
    }

    const applications = await Application.find({ task: taskId })
      .populate("applicant", "name email skills image bio")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Applications fetched successfully.",
      applications,
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function acceptApplication(req, res) {
  try {
    const applicationId = req.params.applicationId;
    const userId = req.user.id;

    const application =
      await Application.findById(applicationId).populate("task");
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    const task = application.task;

    if (!task) {
      return res.status(404).json({ message: "Associated task not found." });
    }

    if (task.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({
          message:
            "You are not authorized to accept applications for this task.",
        });
    }

    if (task.status !== "open") {
      return res
        .status(400)
        .json({ message: "Cannot accept applications for a non-open task." });
    }

    if (application.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending applications can be accepted." });
    }

    // Accept this application
    application.status = "accepted";
    await application.save();

    // Reject all other applications for this task
    await Application.updateMany(
      {
        task: task._id,
        _id: { $ne: application._id },
        status: "pending",
      },
      { $set: { status: "rejected" } }
    );

    // Update task status to "in progress"
    task.status = "in progress";
    task.assignedTo = application.applicant;
    await task.save();
    
    // Create a conversation between task uploader and applicant
    const existingConv = await Conversation.findOne({
      task: task._id,
      application: application._id,
    });

    if (!existingConv) {
      await Conversation.create({
        task: task._id,
        application: application._id,
        participants: [task.uploadedBy, application.applicant],
        status: "active",
      });
    }

    res.status(200).json({
      message: "Application accepted successfully. Task is now in progress.",
      applicationId: application._id,
      taskId: task._id,
    });
  } catch (error) {
    console.error("Error accepting application:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function rejectApplication(req, res) {
  try {
    const applicationId = req.params.applicationId;
    const userId = req.user.id;

    const application =
      await Application.findById(applicationId).populate("task");
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    const task = application.task;

    if (!task) {
      return res.status(404).json({ message: "Associated task not found." });
    }

    if (task.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({
          message:
            "You are not authorized to reject applications for this task.",
        });
    }

    if (task.status !== "open") {
      return res
        .status(400)
        .json({ message: "Cannot reject applications for a non-open task." });
    }

    if (application.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending applications can be rejected." });
    }

    application.status = "rejected";
    await application.save();

    res.status(200).json({
      message: "Application rejected successfully.",
      applicationId: application._id,
    });
  } catch (error) {
    console.error("Error rejecting application:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function getMyApplications(req, res) {
  try {
    const userId = req.user.id;

    const applications = await Application.find({ applicant: userId })
      .populate("task", "title category deadline status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Your applications fetched successfully.",
      applications,
    });
  } catch (error) {
    console.error("Error fetching user applications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function withdrawApplication(req, res) {
  try {
    const applicationId = req.params.applicationId;
    const userId = req.user.id;

    const application =
      await Application.findById(applicationId).populate("task");
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    if (application.applicant.toString() !== userId) {
      return res
        .status(403)
        .json({
          message: "You are not authorized to withdraw this application.",
        });
    }

    const task = application.task;
    if (!task) {
      return res.status(404).json({ message: "Associated task not found." });
    }

    if (task.status !== "open") {
      return res
        .status(400)
        .json({
          message:
            "Cannot withdraw application for a task that is no longer open.",
        });
    }

    if (application.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending applications can be withdrawn." });
    }

    await application.deleteOne();

    res.status(200).json({
      message: "Application withdrawn successfully.",
      applicationId: application._id,
    });
  } catch (error) {
    console.error("Error withdrawing application:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = {
  applyForTask,
  getApplicationsForTask,
  acceptApplication,
  rejectApplication,
  getMyApplications,
  withdrawApplication,
};
