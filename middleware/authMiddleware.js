module.exports.authMiddleware = (req, res, next) => {
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET;
    const token = req.header("Authorization");
    
    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({ status: 401, message: "Access denied. Invalid token format." });
    }

    try {
        const actualToken = token.split(" ")[1];
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("JWT verification failed:", error.message);
        res.status(401).json({ status: 401, message: "Invalid or expired token" });
    }
};
