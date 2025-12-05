// services/recommendationService.js
const Event = require("../models/Event");
const Feedback = require("../models/Feedback");

// ---- Helpers for distance ----
function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const R = 6371; // Earth radius km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalise { id -> value } to 0–1
function normalizeMap(map) {
  const values = Object.values(map);
  if (!values.length) return map;

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (max === min) {
    const out = {};
    for (const k of Object.keys(map)) {
      out[k] = 0; // all equal, relative differences don't matter
    }
    return out;
  }

  const norm = {};
  for (const [k, v] of Object.entries(map)) {
    norm[k] = (v - min) / (max - min);
  }
  return norm;
}

const recommendationService = {
  async recommendForUser(user, limit = 20) {
    const prefs = user.preferences || {};
    const now = new Date();

    // ---- 1) Base MongoDB filter: upcoming events, with prefs ----
    const filter = {
      start_utc: { $gte: now },
    };

    if (prefs.categories?.length) {
      filter.category = { $in: prefs.categories };
    }

    // Price range
    if (prefs.priceMin != null || prefs.priceMax != null) {
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

    let events = await Event.find(filter).limit(500).lean();
    if (!events.length) return [];

    // ---- 2) Avoid recommending events the user already rated ----
    const ratedEvents = await Feedback.find({ user: user._id }).distinct("event");
    const ratedSet = new Set(ratedEvents.map((id) => id.toString()));

    events = events.filter((evt) => !ratedSet.has(evt._id.toString()));
    if (!events.length) return [];

    const userLatRaw =
      typeof user.lat === "number" ? user.lat : Number(process.env.DEFAULT_LAT);
    const userLonRaw =
      typeof user.lon === "number" ? user.lon : Number(process.env.DEFAULT_LON);

    const userLat = Number.isFinite(userLatRaw) ? userLatRaw : null;
    const userLon = Number.isFinite(userLonRaw) ? userLonRaw : null;

    const maxDistanceKm = prefs.maxDistanceKm || 50;

    // ---- 3) Content-based & context + popularity ----
    const cbfRaw = {};
    const contextRaw = {};
    const popRaw = {};

    const nowMs = now.getTime();
    const maxHoursWindow = 24 * 30; // 30 days

    // 🔥 behavioural preference maps (populated by behaviorService)
    const categoryScores = prefs.categoryScores || {};
    const countryScores = prefs.countryScores || {};
    const keywordScores = prefs.keywordScores || {}; // reserved for future use

    events.forEach((evt) => {
      // --- CBF: explicit prefs + behavioural prefs + price match ---
      let cbfScore = 0;

      // 1) Explicit categories the user selected
      if (prefs.categories?.length && prefs.categories.includes(evt.category)) {
        cbfScore += 0.6;
      }

      // 2) Behavioural category score (from clicks/ratings/searches)
      if (evt.category && categoryScores[evt.category]) {
        // keep it between 0–1 by scaling with a constant
        const w = Math.min(categoryScores[evt.category] / 10, 1);
        cbfScore += 0.4 * w;
      }

      // 3) Behavioural country preference (if you store evt.countryCode)
      if (evt.countryCode && countryScores[evt.countryCode]) {
        const w = Math.min(countryScores[evt.countryCode] / 10, 1);
        cbfScore += 0.2 * w;
      }

      // 4) Price fit (same as before)
      if (
        prefs.priceMin != null &&
        evt.price_min != null &&
        evt.price_min >= prefs.priceMin
      ) {
        cbfScore += 0.1;
      }
      if (
        prefs.priceMax != null &&
        evt.price_max != null &&
        evt.price_max <= prefs.priceMax
      ) {
        cbfScore += 0.1;
      }

      cbfRaw[evt._id.toString()] = cbfScore;

      // --- Context: distance + time proximity ---
      const dist = distanceKm(userLat, userLon, evt.lat, evt.lon);
      let distanceScore = 0;
      if (dist != null) {
        distanceScore = dist > maxDistanceKm ? 0 : 1 - dist / maxDistanceKm;
      }

      const hoursUntil =
        (new Date(evt.start_utc).getTime() - nowMs) / (1000 * 60 * 60);
      let timeScore = 0;
      if (hoursUntil > 0 && hoursUntil <= maxHoursWindow) {
        timeScore = 1 - hoursUntil / maxHoursWindow;
      }

      const contextScore = 0.6 * (distanceScore || 0) + 0.4 * timeScore;
      contextRaw[evt._id.toString()] = contextScore;

      // --- Popularity: from event aggregates ---
      const avgRating =
        evt.ratingCount > 0 ? evt.ratingSum / evt.ratingCount : 0;
      const clickCount = evt.clickCount || 0;
     
      const popScore =
        0.6 * (avgRating / 5) +
        0.2 * Math.tanh(clickCount / 10) ;

      popRaw[evt._id.toString()] = popScore;
    });

    // ---- 4) Collaborative filtering (CF-lite) using Feedback ----
    // Events current user liked (rating >= 4)
    const likedEvents = await Feedback.find({
      user: user._id,
      rating: { $gte: 4 },
    }).distinct("event");

    const cfRaw = {};
    // default zeros
    events.forEach((evt) => {
      cfRaw[evt._id.toString()] = 0;
    });

    if (likedEvents.length) {
      // Find "neighbour" users who also liked these events
      const neighbours = await Feedback.aggregate([
        {
          $match: {
            event: { $in: likedEvents },
            rating: { $gte: 4 },
            user: { $ne: user._id },
          },
        },
        { $group: { _id: "$user", overlap: { $sum: 1 } } },
      ]);

      if (neighbours.length) {
        const neighbourIds = neighbours.map((n) => n._id);

        // Events liked by neighbours
        const neighbourLikes = await Feedback.aggregate([
          {
            $match: {
              user: { $in: neighbourIds },
              rating: { $gte: 4 },
            },
          },
          { $group: { _id: "$event", count: { $sum: 1 } } },
        ]);

        let maxCount = 0;
        const cfCountMap = {};
        neighbourLikes.forEach((n) => {
          const idStr = n._id.toString();
          cfCountMap[idStr] = n.count;
          if (n.count > maxCount) maxCount = n.count;
        });

        // normalise neighbour counts to 0–1
        events.forEach((evt) => {
          const id = evt._id.toString();
          const raw = cfCountMap[id] || 0;
          cfRaw[id] = maxCount > 0 ? raw / maxCount : 0;
        });
      }
    }

    // ---- 5) Normalise each signal & combine (hybrid / L2R-style) ----
    const cbfNorm = normalizeMap(cbfRaw);
    const ctxNorm = normalizeMap(contextRaw);
    const popNorm = normalizeMap(popRaw);
    const cfNorm = normalizeMap(cfRaw);

    const scored = events.map((evt) => {
      const id = evt._id.toString();
      const cbf = cbfNorm[id] || 0;
      const ctx = ctxNorm[id] || 0;
      const pop = popNorm[id] || 0;
      const cf = cfNorm[id] || 0;

      // You can tune these weights for your experiments / thesis
      const finalScore = 0.4 * cbf + 0.25 * ctx + 0.25 * cf + 0.1 * pop;

      return {
        ...evt,
        score: finalScore,
        _cbf: cbf,
        _context: ctx,
        _cf: cf,
        _popularity: pop,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  },
};

module.exports = recommendationService;
