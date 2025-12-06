const router = require("express").Router();
const googleAuth = require("../controllers/googleAuthController");

// Web redirect login → Google popup
router.get("/google", googleAuth.googleRedirect);

// Google callback after login
router.get("/google/callback", googleAuth.googleCallback);

// Mobile/Frontend One-Tap token verification
router.post("/google/verify", googleAuth.verifyGoogleToken);

module.exports = router;
