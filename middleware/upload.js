const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload folder exists
const uploadPath = path.join(__dirname, "..", "uploads", "tasks");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// Optional file type filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/zip",

    // PowerPoint
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "application/vnd.ms-powerpoint", // .ppt

    // Word
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc

    // Text
    "text/plain", // .txt
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = upload;
