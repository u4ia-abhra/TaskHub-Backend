if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");



//Routes
const googleAuthRoutes = require("./routes/googleAuthRoutes");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const profileRoutes = require("./routes/profileRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');


const startAutoPayoutJob = require('./jobs/autoPayoutJob');

const app = express();

// Mount webhook BEFORE express.json()
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    "http://localhost:5173",                    
    "https://task-hub-frontend-three.vercel.app",
    "https://taskhub.digital"
  ]
}));




app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/submissions", submissionRoutes);

// Mount payment routes (regular JSON)
app.use('/api/payments', paymentRoutes);
// For webhook we mount the webhook route separately so it uses express.raw
app.use('/api/webhooks', webhookRoutes);
// start cron job (node-cron). If deploying to Vercel, replace job with Vercel scheduled function separately.
startAutoPayoutJob();

app.all("*", (req, res, next) => {
  next(res.status(404).json({ message: "Route not found" }));
});


/* -------------------- SERVER BOOTSTRAP -------------------- */

async function startServer() {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("❌ MONGODB_URL missing in environment variables");
    }

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB connected");

    // Start cron ONLY after DB is ready
    startAutoPayoutJob();

    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
}

//temp condition to prevent server from starting during Vercel deployment
//autopayout problem
if (process.env.VERCEL !== "1") {
  startServer();
}


module.exports = app;
