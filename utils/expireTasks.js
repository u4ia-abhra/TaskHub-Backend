const Task = require("../models/task");

async function expireOpenTasks() {
  await Task.updateMany(
    { status: "open", deadline: { $lte: new Date() } },
    { $set: { status: "expired" } }
  );
}

module.exports = expireOpenTasks;