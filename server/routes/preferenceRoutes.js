// routes/preferenceRoutes.js
const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/preferences
router.get("/", auth, async (req, res, next) => {
  try {
    res.json(req.user.preferences || {});
  } catch (err) {
    next(err);
  }
});

// PUT /api/preferences
router.put("/", auth, async (req, res, next) => {
  try {
    const { categories, maxDistanceKm,location,   priceMin, priceMax, startDate, endDate } = req.body;

    const prefs = {
      ...(categories && { categories }),
        ...(location && { location }), 
      ...(maxDistanceKm !== undefined && { maxDistanceKm }),
      ...(priceMin !== undefined && { priceMin }),
      ...(priceMax !== undefined && { priceMax }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    };

    req.user.preferences = { ...req.user.preferences.toObject(), ...prefs };
    await req.user.save();

    res.json(req.user.preferences);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
