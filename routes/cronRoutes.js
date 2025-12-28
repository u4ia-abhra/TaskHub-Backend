const express = require("express");
const router = express.Router();

const runDeadlineReminderJob = require("../utils/deadlineReminderJob");

router.get("/deadline-reminders", async (req, res) => {
  try {
    const result = await runDeadlineReminderJob();

    res.status(200).json({
      message: "Deadline reminder job executed.",
      ...result,
    });
  } catch (error) {
    console.error("Deadline reminder cron failed:", error);
    res.status(500).json({
      message: "Deadline reminder cron failed.",
      error: error.message,
    });
  }
});

module.exports = router;
