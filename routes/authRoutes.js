const express = require("express");
const router = express.Router();
const User = require("../models/user");
const authController = require("../controllers/authController");
const {authMiddleware} = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationEmail);
router.post("/request-reset", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);
router.get("/private-profile", authMiddleware, authController.getMe);
router.put("/editUserData", authMiddleware, authController.updateProfile);
router.get("/public-profile/:id", authController.getPublicProfile);
module.exports = router;
