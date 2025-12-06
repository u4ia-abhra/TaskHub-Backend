const Task = require("../models/task");
const { deleteFile } = require("../utils/cloudinaryService");

async function uploadTask(req, res) {
  try {
    const { title, description, category, deadline, budget } = req.body;
    const uploadedBy = req.user.id;

    const parsedDeadline = new Date(deadline);

    // Prevent duplicate title + deadline for the same user
    const existingTask = await Task.findOne({
      title: title.trim(),
      uploadedBy,
      deadline: parsedDeadline,
    });

    if (existingTask) {
      return res.status(400).json({
        message:
          "You already have a task with the same title and deadline. Please choose a different title or deadline.",
      });
    }

    const newTask = new Task({
      title: title.trim(),
      description: description.trim(),
      category,
      deadline: parsedDeadline,
      budget,
      uploadedBy,
      attachments: req.attachments || [], // NEW
    });

    await newTask.validate();
    await newTask.save();

    return res.status(201).json({
      message: "Task uploaded successfully.",
      task: newTask,
    });
  } catch (error) {
    console.error("Error uploading task:", error);

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
      message: "An error occurred while uploading the task.",
      error: error.message,
    });
  }
};

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

    // Delete attachments from Cloudinary (best-effort)
    if (task.attachments && task.attachments.length > 0) {
      for (const attachment of task.attachments) {
        try {
          await deleteFile(attachment.publicId, attachment.resourceType);
        } catch (err) {
          console.error(
            `Failed to delete attachment ${attachment.publicId} from Cloudinary:`,
            err
          );
        }
      }
    }

    await task.deleteOne();

    return res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({
      message: "An error occurred while deleting the task.",
      error: error.message,
    });
  }
};

async function editTask(req, res) {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    // Text fields (from validateTaskUpdate)
    const { title, description, category, deadline, budget } = req.body;

    // Optional: attachmentsToRemove sent as JSON string in form-data
    let attachmentsToRemove = [];
    if (req.body.attachmentsToRemove) {
      try {
        const parsed = JSON.parse(req.body.attachmentsToRemove);

        if (!Array.isArray(parsed)) {
          return res.status(400).json({
            message:
              "attachmentsToRemove must be a JSON array of Cloudinary public IDs.",
          });
        }

        // Keep only string values
        attachmentsToRemove = parsed.filter(
          (id) => typeof id === "string" && id.trim() !== ""
        );
      } catch (parseError) {
        return res.status(400).json({
          message:
            "Invalid attachmentsToRemove format. It must be a valid JSON array of strings.",
          error: parseError.message,
        });
      }
    }

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

    const parsedDeadline =
      deadline instanceof Date ? deadline : new Date(deadline);

    // Optional: uniqueness check on title + deadline for this user (excluding current task)
    const existingTask = await Task.findOne({
      _id: { $ne: taskId },
      uploadedBy: userId,
      title: title.trim(),
      deadline: parsedDeadline,
    });

    if (existingTask) {
      return res.status(400).json({
        message:
          "You already have a task with the same title and deadline. Please choose a different title or deadline.",
      });
    }

    // 1) Handle removal of existing attachments (if any)
    if (attachmentsToRemove.length > 0 && task.attachments.length > 0) {
      const idsToRemoveSet = new Set(attachmentsToRemove);

      const attachmentsToKeep = [];
      const attachmentsToDelete = [];

      for (const att of task.attachments) {
        if (idsToRemoveSet.has(att.publicId)) {
          attachmentsToDelete.push(att);
        } else {
          attachmentsToKeep.push(att);
        }
      }

      // Delete from Cloudinary (best-effort)
      for (const att of attachmentsToDelete) {
        try {
          await deleteFile(att.publicId, att.resourceType || "raw");
        } catch (err) {
          console.error(
            `Failed to delete attachment ${att.publicId} from Cloudinary:`,
            err
          );
          // We don't fail the whole request here; just log the error.
        }
      }

      // Keep only non-removed attachments in the task document
      task.attachments = attachmentsToKeep;
    }

    // 2) Handle new attachments (files uploaded in this request)
    const newAttachments = req.attachments || [];

    if (newAttachments.length > 0) {
      const totalAttachments = task.attachments.length + newAttachments.length;

      if (totalAttachments > 5) {
        return res.status(400).json({
          message:
            "You can have a maximum of 5 attachments per task. Remove some existing attachments before adding more.",
        });
      }

      task.attachments.push(...newAttachments);
    }

    // 3) Update basic fields
    task.title = title.trim();
    task.description = description.trim();
    task.category = category;
    task.deadline = parsedDeadline;
    task.budget = budget;

    // Validate and save
    await task.validate();
    await task.save();

    return res.status(200).json({
      message: "Task updated successfully.",
      task,
    });
  } catch (error) {
    console.error("Error editing task:", error);

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
