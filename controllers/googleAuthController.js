const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

const emailRegex = /^[0-9]{7,8}@kiit\.ac\.in$/;

// 🔥 Helper to determine frontend URL dynamically
const getFrontendUrl = (req) => {
  const referer = req.get('referer') || req.get('origin');
  
  // Check if request came from localhost
  if (referer && (referer.includes('localhost') || referer.includes('127.0.0.1'))) {
    // Extract the full localhost URL (with port)
    const match = referer.match(/(https?:\/\/localhost:\d+)/);
    if (match) {
      console.log('[getFrontendUrl] Detected localhost:', match[1]);
      return match[1];
    }
  }
  
  // Fallback to production URL
  const productionUrl = process.env.FRONTEND_URL || 'https://task-hub-frontend-three.vercel.app';
  console.log('[getFrontendUrl] Using production URL:', productionUrl);
  return productionUrl;
};

// Step 1: Redirect user to Google Login
exports.googleRedirect = async (req, res) => {
  try {
    // Store the frontend URL in session/state for callback
    const frontendUrl = getFrontendUrl(req);
    
    const authorizeUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ],
      // Pass frontend URL as state parameter
      state: Buffer.from(frontendUrl).toString('base64'),
    });
    
    console.log("[Google Redirect] Redirecting to:", authorizeUrl);
    console.log("[Google Redirect] Frontend URL encoded in state:", frontendUrl);
    return res.redirect(authorizeUrl);
  } catch (err) {
    console.error("Google Redirect Error:", err);
    const frontendUrl = getFrontendUrl(req);
    return res.redirect(
      `${frontendUrl}/oauth-error?reason=server_error`
    );
  }
};

// Step 2: Google Callback → Exchange Code → Verify User → JWT
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    console.log("[Google Callback] Received code:", code ? "YES" : "NO");
    console.log("[Google Callback] Received state:", state ? "YES" : "NO");

    // Decode frontend URL from state parameter
    let frontendUrl;
    if (state) {
      try {
        frontendUrl = Buffer.from(state, 'base64').toString('utf-8');
        console.log("[Google Callback] Decoded frontend URL from state:", frontendUrl);
      } catch (err) {
        console.error("[Google Callback] Failed to decode state:", err);
        frontendUrl = process.env.FRONTEND_URL || 'https://task-hub-frontend-three.vercel.app';
      }
    } else {
      frontendUrl = process.env.FRONTEND_URL || 'https://task-hub-frontend-three.vercel.app';
    }

    if (!code) {
      console.error("[Google Callback] No authorization code received");
      return res.redirect(
        `${frontendUrl}/oauth-error?reason=no_code`
      );
    }

    // Exchange code for tokens
    const r = await client.getToken(code);
    const idToken = r.tokens.id_token;

    console.log("[Google Callback] Got ID token:", idToken ? "YES" : "NO");

    if (!idToken) {
      throw new Error("No ID token received from Google");
    }

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    console.log("[Google Callback] User email:", email);

    const normalizedEmail = email.toLowerCase().trim();

    // Validate KIIT email
    if (!emailRegex.test(normalizedEmail)) {
      console.log("[Google Callback] Invalid KIIT email:", normalizedEmail);
      return res.redirect(
        `${frontendUrl}/oauth-error?reason=invalid_email`
      );
    }

    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });

    // Create user if new
    if (!user) {
      console.log("[Google Callback] Creating new user:", normalizedEmail);
      user = await User.create({
        name,
        email: normalizedEmail,
        password: null,
        role: "both",
        isVerified: true,
        image: picture,
      });
    } else {
      console.log("[Google Callback] Existing user found:", normalizedEmail);
    }

    // Issue our own JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("[Google Callback] JWT created, redirecting to:", frontendUrl);
    
    // Redirect back to frontend with JWT (using the correct frontend URL)
    return res.redirect(
      `${frontendUrl}/oauth-success?token=${token}`
    );
  } catch (err) {
    console.error("Google Callback Error:", err.message);
    console.error("Full error:", err);
    const frontendUrl = process.env.FRONTEND_URL || 'https://task-hub-frontend-three.vercel.app';
    return res.redirect(
      `${frontendUrl}/oauth-error?reason=google_failed`
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

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error("Google Token Verification Error:", err);
    return res.status(400).json({ message: "Invalid Google token" });
  }
};
