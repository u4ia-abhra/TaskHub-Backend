const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const taskController = require("../controllers/taskController");
const { validateTaskInput,validateTaskUpdate } = require('../middleware/taskValidation'); // Your validation middleware

router.post("/upload", authMiddleware, validateTaskInput, taskController.uploadTask);

router.get("/", taskController.viewTasks);

router.get("/my-tasks", authMiddleware, taskController.getMyTasks);

router.patch("/:id/status", authMiddleware, taskController.updateTaskStatus);

router.delete("/:id", authMiddleware, taskController.deleteTask);

router.put("/edit/:id", authMiddleware, validateTaskUpdate, taskController.editTask);

module.exports = router;