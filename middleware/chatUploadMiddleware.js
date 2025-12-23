const multer = require("multer");

// In-memory storage
const storage = multer.memoryStorage();

// Chat-specific limits
const MAX_CHAT_FILES = 3;
const MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// You can reuse/extend your allowed MIME types
function chatFileFilter(req, file, cb) {
  // For now allow everything; you can restrict like task upload
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_CHAT_FILE_SIZE,
    files: MAX_CHAT_FILES,
  },
  fileFilter: chatFileFilter,
});

// Field name: "attachments"
const uploadChatAttachments = upload.array("attachments", MAX_CHAT_FILES);

module.exports = {
  uploadChatAttachments,
  MAX_CHAT_FILES,
  MAX_CHAT_FILE_SIZE,
};
