// routes/eventRoutes.js
const express = require("express");
const auth = require("../middleware/auth");
const Event = require("../models/Event");
const recommendationService = require("../services/recommendationService");

const router = express.Router();

// GET /api/events/search
// query params: q, category, minPrice, maxPrice, startDate, endDate
router.get("/search", async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, startDate, endDate } = req.query;

    const filter = {};

    if (category) filter.category = category;

    if (minPrice || maxPrice) {
      filter.price_min = {};
      if (minPrice) filter.price_min.$gte = Number(minPrice);
      if (maxPrice) filter.price_min.$lte = Number(maxPrice);
    }

    if (startDate || endDate) {
      filter.start_utc = {};
      if (startDate) filter.start_utc.$gte = new Date(startDate);
      if (endDate) filter.start_utc.$lte = new Date(endDate);
    }

    let query = Event.find(filter);

    if (q) {
      query = query.find({ $text: { $search: q } });
    }

    const events = await query.sort({ start_utc: 1 }).limit(100).lean();

    res.json(events);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id
router.get("/:id", async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    // increment clickCount in background-ish
    Event.findByIdAndUpdate(event._id, { $inc: { clickCount: 1 } }).catch(() => {});

    res.json(event);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/recommend
router.get("/recommend/me", auth, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const recommendations = await recommendationService.recommendForUser(req.user, limit);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
