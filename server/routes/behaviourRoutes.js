// routes/behaviorRoutes.js
const express = require("express");
const auth = require("../middleware/auth");
const behaviorService = require("../services/behaviorService");

const router = express.Router();

// POST /api/behavior/search
router.post("/search", auth, async (req, res, next) => {
  try {
    const { q, category, country, source, minPrice, maxPrice } = req.body;
    await behaviorService.logSearch(req.user, {
      q,
      category,
      country,
      source,
      minPrice,
      maxPrice,
    });
    res.json({ status: "ok" });
  } catch (err) {
    next(err);
  }
});

// POST /api/behavior/click
router.post("/click", auth, async (req, res, next) => {
  try {
    const payload = req.body;

    if (!payload.eventId && !payload.externalId) {
      return res
        .status(400)
        .json({ message: "eventId or externalId is required" });
    }

    await behaviorService.logEventClick(req.user, payload);
    res.json({ status: "ok" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
