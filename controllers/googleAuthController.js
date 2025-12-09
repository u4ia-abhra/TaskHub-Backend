const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

const emailRegex = /^[0-9]{7,8}@kiit\.ac\.in$/;

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
    
    if (!code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/oauth-error?reason=no_code`
      );
    }

    const r = await client.getToken(code);
    const idToken = r.tokens.id_token;
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/oauth-error?reason=invalid_email`
      );
    }

    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });

    // Create user if new
    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        password: null,
        role: "both",
        isVerified: true,
        image: picture,
      });
    }

    // Issue JWT with user ID
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Encode user data separately to pass in URL (optional approach)
    // Better: Let frontend fetch user data using token
    const userData = encodeURIComponent(JSON.stringify({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      isVerified: user.isVerified,
    }));

    // Redirect with both token and user data
    return res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?token=${token}&user=${userData}`
    );
  } catch (err) {
    console.error("Google Callback Error:", err);
    return res.redirect(
      `${process.env.FRONTEND_URL}/oauth-error?reason=google_failed`
    );
  }
};

// Step 3: Mobile / One-Tap Google login → Verify ID Token directly
exports.verifyGoogleToken = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid KIIT email format" });
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        password: null,
        role: "both",
        isVerified: true,
        image: picture,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return both token and user data
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        isVerified: user.isVerified,
        phone: user.phone,
        roll: user.roll,
        branch: user.branch,
        bio: user.bio,
        skills: user.skills,
        year: user.year,
      },
    });
  } catch (err) {
    console.error("Google Token Verification Error:", err);
    return res.status(400).json({ message: "Invalid Google token" });
  }
};
