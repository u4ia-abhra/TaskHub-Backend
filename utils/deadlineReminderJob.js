const Task = require("../models/task");
const sendDeadlineReminderEmail = require("../utils/emails/sendDeadlineReminderEmail");

/**
 * Runs periodically (via cron)
 * Sends reminder emails ~24h before task deadline
 */
async function runDeadlineReminderJob() {
  const now = new Date();

  // 24h → 25h window
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  console.log("Now:", now);
  console.log("Window start:", windowStart);
  console.log("Window end:", windowEnd);

  const tasks = await Task.find({
    status: "in progress",
    assignedTo: { $exists: true, $ne: null },
    deadlineReminderSent: false,
    deadline: {
      $gte: windowStart,
      $lte: windowEnd,
    },
  }).populate("assignedTo", "name email");

  let processed = 0;

  for (const task of tasks) {
    if (!task.assignedTo) continue;

    try {
      await sendDeadlineReminderEmail({
        freelancerEmail: task.assignedTo.email,
        freelancerName: task.assignedTo.name,
        taskTitle: task.title,
        taskId: task._id,
        deadline: task.deadline.toDateString(),
      });

      task.deadlineReminderSent = true;
      await task.save();

      processed++;
    } catch (error) {
      console.error(
        `Deadline reminder failed for task ${task._id}:`,
        error.message
      );
    }
  }

  return {
    checkedTasks: tasks.length,
    remindersSent: processed,
  };
}

module.exports = runDeadlineReminderJob;
