// config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = "mongodb://127.0.0.1:27017/event-recommender"; // force IPv4

    console.log("Connecting to:", uri);

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
