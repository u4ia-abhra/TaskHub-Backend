const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,  
});

// Step 1: Redirect user to Google Login
exports.googleRedirect = async (req, res) => {
  try {
    const authorizeUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ],
    });

    return res.redirect(authorizeUrl);
  } catch (err) {
    console.error("Google Redirect Error:", err);
    return res.status(500).json({ message: "Failed to start Google OAuth" });
  }
};

// Step 2: Google Callback → Exchange Code → Verify User → JWT
exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    const r = await client.getToken(code);
    const idToken = r.tokens.id_token;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    // Create user if new
    if (!user) {
      user = await User.create({
        name,
        email,
        password: null,
        role: "both",
        isVerified: true,
        image: picture,
      });
    }

    // Issue our own JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect back to frontend with JWT
    return res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?token=${token}`
    );
  } catch (err) {
    console.error("Google Callback Error:", err);
    return res.status(500).json({ message: "Google authentication failed" });
  }
};

// Step 3: Mobile / One-Tap Google login → Verify ID Token directly
exports.verifyGoogleToken = async (req, res) => {
  try {
    const { idToken } = req.body;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: null,
        role: "both",
        isVerified: true,
        image: picture,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({ token });
  } catch (err) {
    console.error("Google Token Verification Error:", err);
    return res.status(400).json({ message: "Invalid Google token" });
  }
};
