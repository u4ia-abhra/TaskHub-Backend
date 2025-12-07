const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const taskController = require("../controllers/taskController");
const {
  validateTaskInput,
  validateTaskUpdate,
} = require("../middleware/taskValidation"); 
const { uploadTaskAttachments } = require("../middleware/uploadMiddleware");
const {
  processTaskAttachments,
} = require("../middleware/attachmentsProcessing");

router.post(
  "/upload",
  authMiddleware,
  uploadTaskAttachments,
  processTaskAttachments,
  validateTaskInput,
  taskController.uploadTask
);

router.get("/", taskController.viewTasks);

router.get("/my-tasks", authMiddleware, taskController.getMyTasks);

router.get("/:id", taskController.getTaskById);

router.patch("/:id/status", authMiddleware, taskController.updateTaskStatus);

router.delete("/:id", authMiddleware, taskController.deleteTask);

router.put(
  "/edit/:id",
  authMiddleware,
    uploadTaskAttachments,
    processTaskAttachments,
  validateTaskUpdate,
  taskController.editTask
);

module.exports = router;
