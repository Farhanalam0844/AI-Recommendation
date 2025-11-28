// routes/importRoutes.js
const express = require("express");
const ingestionService = require("../services/ingestionService");
// You could protect this with auth + admin check later
const router = express.Router();

// POST /api/import/events
router.post("/events", async (req, res, next) => {
  try {
    const result = await ingestionService.ingestAll();
    res.json({ message: "Ingestion completed", ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
