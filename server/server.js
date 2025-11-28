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
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// DB
connectDB();

// Middleware
const corsOptions = {
  origin: "http://localhost:5173", // frontend origin
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false // or true if you ever use cookies
};

app.use(cors(corsOptions)); 
// This line is IMPORTANT for preflight:
// app.options("*", cors(corsOptions));

// Body parser
app.use(express.json());

// Optional logger to see requests
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });
// Health check

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/import", importRoutes);

app.get("/", (req, res) => {
    console.log("Health check OK");
  res.json({ status: "OK", message: "Event recommender backend running" });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT =  5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
