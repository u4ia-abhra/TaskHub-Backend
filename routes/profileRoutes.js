const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { uploadProfileImage } = require("../middleware/profileUploadMiddleware");
const { updateProfileImage, removeProfileImage } = require("../controllers/profileController");

router.put("/image", authMiddleware, uploadProfileImage, updateProfileImage);

router.delete("/image", authMiddleware, removeProfileImage);

module.exports = router;