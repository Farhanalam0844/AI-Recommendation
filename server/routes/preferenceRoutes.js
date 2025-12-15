// routes/preferenceRoutes.js
const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

function normalizeCountryCode(input) {
  const v = String(input || "").trim();
  if (!v) return undefined;

  const low = v.toLowerCase();
  if (["world", "all", "global"].includes(low)) return undefined;

  const iso2 = v.toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2)) return undefined;
  return iso2;
}

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
    const {
      categories,
      maxDistanceKm,
      location,
      priceMin,
      priceMax,
      startDate,
      endDate,
      preferredCountry,
    } = req.body;

    const prefsUpdate = {
      ...(categories && { categories }),
      ...(location && { location }),
      ...(maxDistanceKm !== undefined && { maxDistanceKm }),
      ...(priceMin !== undefined && { priceMin }),
      ...(priceMax !== undefined && { priceMax }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    // ✅ hard override country stored as ISO2
    if (preferredCountry !== undefined) {
      const iso2 = normalizeCountryCode(preferredCountry);
      // allow clearing by sending "world"/"all"/"" -> becomes undefined (removes override)
      prefsUpdate.preferredCountry = iso2;
    }

    // merge safely (req.user.preferences is a Mongoose subdoc)
    const currentPrefs =
      req.user.preferences && typeof req.user.preferences.toObject === "function"
        ? req.user.preferences.toObject()
        : req.user.preferences || {};

    req.user.preferences = { ...currentPrefs, ...prefsUpdate };
    req.user.markModified("preferences");
    await req.user.save();

    res.json(req.user.preferences);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
