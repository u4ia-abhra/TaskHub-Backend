const Task = require("../models/task");

async function checkReviewEligibility(taskId, reviewerId) {
  const task = await Task.findById(taskId);

  if (!task) {
    return { error: "Task not found." };
  }

  if (task.status !== "completed") {
    return { error: "Task must be completed before reviewing." };
  }

  const isUploader = task.uploadedBy.toString() === reviewerId;
  const isFreelancer = task.assignedTo?.toString() === reviewerId;

  if (!isUploader && !isFreelancer) {
    return { error: "You are not allowed to review this task." };
  }

  const reviewerRole = isUploader ? "uploader" : "freelancer";
  const reviewee = isUploader ? task.assignedTo : task.uploadedBy;

  return { task, reviewerRole, reviewee };
}

module.exports = { checkReviewEligibility };
