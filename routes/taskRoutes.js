const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const taskController = require("../controllers/taskController");
const { validateTaskInput } = require('../middleware/taskValidation'); // Your validation middleware
const upload = require("../middleware/upload");

router.post(
  "/upload",
  authMiddleware,
  (req, res, next) => {
    console.log("Incoming upload request");
    next();
  },
  upload.array("attachments", 5),
  (req, res, next) => {
    console.log("Files parsed:", req.files);
    next();
  },
  validateTaskInput,
  taskController.uploadTask
);

router.get("/", taskController.viewTasks);

router.get("/my-tasks", authMiddleware, taskController.getMyTasks);

router.patch("/:id/status", authMiddleware, taskController.updateTaskStatus);

router.delete("/:id", authMiddleware, taskController.deleteTask);

router.put(
  "/edit/:id",
  authMiddleware,
  upload.array("attachments", 5),  // 👈 allow up to 5 new attachments
  taskController.editTask
);

module.exports = router;

