const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const taskController = require("../controllers/taskController");
const { validateTaskInput } = require('../middleware/taskValidation'); // Your validation middleware

router.post("/upload", authMiddleware, validateTaskInput, taskController.uploadTask);

router.get("/", authMiddleware, taskController.viewTasks);

// router.delete("/:id", authMiddleware, taskController.deleteTask);

// router.put("/edit/:id", authMiddleware, taskController.editTask);

module.exports = router;

