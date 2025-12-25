const multer = require("multer");

const storage = multer.memoryStorage();

const uploadSubmissionAttachments = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 5,                  // max 5 attachments
  },
}).array("attachments", 5);

module.exports = { uploadSubmissionAttachments };
