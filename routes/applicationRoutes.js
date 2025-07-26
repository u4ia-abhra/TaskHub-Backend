const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

const applicationController = require("../controllers/applicationController");

router.post("/:id/apply", authMiddleware, applicationController.applyForTask);

router.get("/task/:taskId", authMiddleware, applicationController.getApplicationsForTask);

router.patch("/:applicationId/accept", authMiddleware, applicationController.acceptApplication);

router.patch("/:applicationId/reject", authMiddleware, applicationController.rejectApplication);

router.get("/my", authMiddleware, applicationController.getMyApplications);

router.delete("/:applicationId/withdraw", authMiddleware, applicationController.withdrawApplication);

module.exports = router;
