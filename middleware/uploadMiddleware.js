const multer = require("multer");

// In-memory storage (required for Vercel / serverless)
const storage = multer.memoryStorage();

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Very permissive mime-type filter (you can restrict more if you like)
function fileFilter(req, file, cb) {
  // Example: allow all for now, rely on size & count limits
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
});

// For tasks, we expect field name: "attachments"
const uploadTaskAttachments = upload.array("attachments", MAX_FILES);

module.exports = {
  uploadTaskAttachments,
  MAX_FILES,
  MAX_FILE_SIZE,
};
