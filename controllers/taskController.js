const Task = require("../models/task");

async function uploadTask(req, res) {
  try {
    const { title, description, category, deadline, budget } = req.body;
    const uploadedBy = req.user?.id;

    const parsedDeadline = new Date(deadline);

    const existingTask = await Task.findOne({
      title: title,
      uploadedBy: uploadedBy,
      deadline: parsedDeadline,
    });

    if (existingTask) {
      return res.status(409).json({
        message: "A task with this title and deadline already exists for you.",
      });
    }

    const newTask = new Task({
      title,
      description,
      category,
      deadline,
      budget,
      uploadedBy,
    });

    await newTask.validate();
    await newTask.save();

    return res.status(201).json({
      status: 201,
      message: "Task uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading task:", error);

    if (error.name === "ValidationError") {
      const errors = {};
      for (let field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        message: "Validation failed",
        errors: errors,
      });
    }

    return res.status(500).json({
      message: "Server error while uploading task",
      error: error.message,
    });
  }
}

async function viewTasks(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sortBy,
      order,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;

    if (search) {
      const keyword = search.trim();
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    // Sorting
    const validSortFields = ["budget", "deadline", "createdAt"];
    const sortOrder = order === "desc" ? -1 : 1;

    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sortBy && validSortFields.includes(sortBy)) {
      sortOption = { [sortBy]: sortOrder };
    }

    const skip = (page - 1) * limit;

    const tasks = await Task.find(query)
      .populate("uploadedBy", "name email")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      totalTasks: total,
      totalPages,
      currentPage: parseInt(page),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function getMyTasks(req, res) {
  try {
    const userId = req.user.id;
    const tasks = await Task.find({ uploadedBy: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function updateTaskStatus(req, res) {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body;

    const allowedStatuses = ["open", "in progress", "completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (task.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this task." });
    }

    task.status = status;
    await task.save();

    res
      .status(200)
      .json({ message: "Task status updated successfully.", task });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function deleteTask(req, res) {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (task.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this task." });
    }

    await task.deleteOne();

    res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function editTask (req, res) {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    // After validateTaskUpdate, these are already trimmed / converted
    const { title, description, category, deadline, budget } = req.body;

    // Find task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Ownership check
    if (task.uploadedBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this task." });
    }

    // Only open tasks can be edited
    if (task.status !== "open") {
      return res.status(400).json({
        message: "Only tasks with status 'open' can be edited.",
      });
    }

    // Enforce unique (title + deadline) per user, excluding current task
    const existingTask = await Task.findOne({
      _id: { $ne: taskId },
      uploadedBy: userId,
      title: title.trim(),
      deadline: deadline instanceof Date ? deadline : new Date(deadline),
    });

    if (existingTask) {
      return res.status(400).json({
        message:
          "You already have a task with the same title and deadline. Please choose a different title or deadline.",
      });
    }

    // Apply updates
    task.title = title.trim();
    task.description = description.trim();
    task.category = category;
    task.deadline =
      deadline instanceof Date ? deadline : new Date(deadline);
    task.budget = budget;

    // Double-check Mongoose validation (schema-level)
    await task.validate();
    await task.save();

    return res.status(200).json({
      message: "Task updated successfully.",
      task,
    });
  } catch (error) {
    console.error("Error editing task:", error);

    // Handle Mongoose validation errors nicely
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        message: "Validation failed.",
        errors,
      });
    }

    return res.status(500).json({
      message: "An error occurred while editing the task.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadTask,
  viewTasks,
  getMyTasks,
  updateTaskStatus,
  deleteTask,
  editTask,
};
