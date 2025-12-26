const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const { uploadSubmissionAttachments } = require("../middleware/submissionUploadMiddleware");
const submissionController = require("../controllers/submissionController");

router.post(
  "/tasks/:taskId/submissions",
  authMiddleware,
  uploadSubmissionAttachments,
  submissionController.createSubmission
);

router.get(
  "/tasks/:taskId/submissions",
  authMiddleware,
  submissionController.getSubmissions
);

router.patch(
  "/submissions/:id/accept",
  authMiddleware,
  submissionController.acceptSubmission
);

router.patch(
  "/submissions/:id/request-revision",
  authMiddleware,
  submissionController.requestRevision
);

module.exports = router;
