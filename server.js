if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const dbUrl = process.env.MONGODB_URL;
const app = express();

let isConnected = false;

const connectToDB = async () => {
  if (isConnected) {
    console.log("Using existing database connection");
    return;
  }
  try {
    await mongoose.connect(dbUrl);
    isConnected = true;
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    isConnected = false;
  }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(async (req, res, next) => {
  await connectToDB();
  next();
});

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

app.all("*", (req, res, next) => {
  next(res.status(404).json({ message: "Route not found" }));
});

module.exports = app;

if (require.main === module) {
    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
}
