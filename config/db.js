const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

if (!process.env.MONGODB_URL) {
  throw new Error("❌ MONGODB_URL not found in environment variables");
}

const client = new MongoClient(process.env.MONGODB_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

async function connectDB() {
  if (db) return db; // connection reuse = performance win

  try {
    await client.connect();
    db = client.db(); // default DB from URI
    console.log("✅ MongoDB connected successfully");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection failed", err);
    process.exit(1);
  }
}

module.exports = {
  client,
  connectDB,
};
