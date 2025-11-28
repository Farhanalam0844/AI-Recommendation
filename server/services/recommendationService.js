// services/recommendationService.js
const Event = require("../models/Event");

function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const recommendationService = {
  async recommendForUser(user, limit = 20) {
    const prefs = user.preferences || {};
    const now = new Date();

    // Base filter
    const filter = {
      start_utc: { $gte: now }
    };

    if (prefs.categories?.length) {
      filter.category = { $in: prefs.categories };
    }

    // Price range
    if (prefs.priceMin || prefs.priceMax) {
      filter.price_min = {};
      if (prefs.priceMin != null) filter.price_min.$gte = prefs.priceMin;
      if (prefs.priceMax != null) filter.price_min.$lte = prefs.priceMax;
    }

    // Time window
    if (prefs.startDate || prefs.endDate) {
      filter.start_utc = filter.start_utc || {};
      if (prefs.startDate) filter.start_utc.$gte = new Date(prefs.startDate);
      if (prefs.endDate) filter.start_utc.$lte = new Date(prefs.endDate);
    }

    const events = await Event.find(filter).limit(500).lean();

    const userLat = user.lat ?? Number(process.env.DEFAULT_LAT);
    const userLon = user.lon ?? Number(process.env.DEFAULT_LON);
    const maxDistanceKm = prefs.maxDistanceKm || 50;

    const scored = events.map((evt) => {
      // --- CBF score (category & price match) ---
      let cbfScore = 0;
      if (prefs.categories?.length && prefs.categories.includes(evt.category)) {
        cbfScore += 0.6;
      }

      if (prefs.priceMin != null && evt.price_min != null && evt.price_min >= prefs.priceMin)
        cbfScore += 0.1;
      if (prefs.priceMax != null && evt.price_max != null && evt.price_max <= prefs.priceMax)
        cbfScore += 0.1;

      // --- CF-lite / popularity score ---
      const avgRating = evt.ratingCount > 0 ? evt.ratingSum / evt.ratingCount : 0;
      const cfScore =
        0.6 * (avgRating / 5) +
        0.2 * Math.tanh((evt.clickCount || 0) / 10) +
        0.2 * Math.tanh((evt.bookmarkCount || 0) / 5);

      // --- Context score (distance + time proximity) ---
      const dist = distanceKm(userLat, userLon, evt.lat, evt.lon);
      let distanceScore = 0;
      if (dist != null) {
        distanceScore = dist > maxDistanceKm ? 0 : 1 - dist / maxDistanceKm;
      }

      const hoursUntil = (new Date(evt.start_utc) - now) / (1000 * 60 * 60);
      let timeScore = 0;
      if (hoursUntil > 0 && hoursUntil <= 24 * 30) {
        timeScore = 1 - hoursUntil / (24 * 30); // events in ~30 days
      }

      const contextScore = 0.6 * (distanceScore || 0) + 0.4 * timeScore;

      // --- Combine like L2R-style scoring ---
      const finalScore = 0.5 * cbfScore + 0.3 * cfScore + 0.2 * contextScore;

      return { ...evt, score: finalScore, distanceKm: dist };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }
};

module.exports = recommendationService;
