// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");
const eventRoutes = require("./routes/eventRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const importRoutes = require("./routes/importRoutes");
const behaviorRoutes = require("./routes/behaviourRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// DB
connectDB();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // credentials: false, // don't need this unless using cookies
  })
);
// Body parser
app.use(express.json());




// Routes
app.use("/api/auth", authRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/import", importRoutes);
app.use("/api/behavior", behaviorRoutes);

app.get("/", (req, res) => {
    console.log("Health check OK");
  res.json({ status: "OK", message: "Event recommender backend running" });
});

// // Error handling
app.use(notFound);
app.use(errorHandler);

const PORT =  8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
