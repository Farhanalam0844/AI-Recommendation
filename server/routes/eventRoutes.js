// routes/eventRoutes.js
const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const Event = require("../models/Event");
const recommendationService = require("../services/recommendationService");
const behaviorService = require("../services/behaviorService");

const router = express.Router();

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
console.log("🚀 TICKETMASTER_API_KEY loaded?", !!TICKETMASTER_API_KEY);

// ---------- SHARED HELPERS (distance, tokenize, scoring) ----------

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
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

// pick top key from a map like { key -> score }
function pickTopKey(map) {
  if (!map) return null;
  let bestKey = null;
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === "number" && v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}

/**
 * Re-rank external events for a given user
 * using behaviour-based preferences (categories, keywords, countries),
 * budget, distance & time.
 */
function scoreExternalEventsForUser(user, events) {
  if (!user) return events;

  const prefs = user.preferences || {};
  const nowMs = Date.now();

  const categoryScores = prefs.categoryScores || {};
  const countryScores = prefs.countryScores || {};
  const keywordScores = prefs.keywordScores || {};

  const priceMinPref = prefs.priceMin;
  const priceMaxPref = prefs.priceMax;

  const userLat = Number.isFinite(user.lat) ? user.lat : null;
  const userLon = Number.isFinite(user.lon) ? user.lon : null;

  const maxDistanceKm = prefs.maxDistanceKm || 50;
  const maxHoursWindow = 24 * 30; // 30 days

  return events
    .map((evt) => {
      let score = 0;

      // 1) Category behaviour
      if (evt.category && categoryScores[evt.category]) {
        const w = Math.min(categoryScores[evt.category] / 10, 1);
        score += 0.5 * w;
      }

      // 2) Country behaviour
      const countryCode = evt.countryCode || evt.country;
      if (countryCode && countryScores[countryCode]) {
        const w = Math.min(countryScores[countryCode] / 10, 1);
        score += 0.3 * w;
      }

      // 3) Keyword behaviour (title vs keywordScores)
      const tokens = tokenize(evt.title);
      let kwScore = 0;
      tokens.forEach((t) => {
        if (keywordScores[t]) {
          kwScore += keywordScores[t];
        }
      });
      if (kwScore > 0) {
        score += 0.2 * Math.min(kwScore / 5, 1);
      }

      // 4) Budget fit vs learned prefs
      const eMin = evt.priceMin ?? evt.priceMax;
      const eMax = evt.priceMax ?? evt.priceMin;

      if (priceMinPref != null && eMin != null && eMin >= priceMinPref) {
        score += 0.1;
      }
      if (priceMaxPref != null && eMax != null && eMax <= priceMaxPref) {
        score += 0.1;
      }

      // 5) Context (distance + time)
      let ctxScore = 0;

      // distance
      if (evt.lat != null && evt.lon != null && userLat != null && userLon != null) {
        const d = distanceKm(userLat, userLon, evt.lat, evt.lon);
        if (d != null && d <= maxDistanceKm) {
          ctxScore += 0.4 * (1 - d / maxDistanceKm);
        }
      }

      // time
      if (evt.date) {
        const iso = evt.time ? `${evt.date}T${evt.time}` : `${evt.date}T00:00`;
        const startMs = new Date(iso).getTime();
        const hoursUntil = (startMs - nowMs) / (1000 * 60 * 60);
        if (hoursUntil > 0 && hoursUntil <= maxHoursWindow) {
          ctxScore += 0.6 * (1 - hoursUntil / maxHoursWindow);
        }
      }

      score += ctxScore;

      return { ...evt, score };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

// -------------------------------------------------------------------
// GET /api/events/search (internal DB search)
// -------------------------------------------------------------------
router.get("/search", async (req, res, next) => {
  console.log("Search endpoint hit with query:", req.query);
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

// -------------------------------------------------------------------
// GET /api/events/external (personalised search with live API data)
// query: q, category, country, minPrice, maxPrice
// -------------------------------------------------------------------
router.get("/external", auth, async (req, res, next) => {
  console.log("🧪 /events/external query:", req.query);

  const { q, category, country, minPrice, maxPrice } = req.query;

  const numericMin =
    minPrice != null && minPrice !== "" ? Number(minPrice) : undefined;
  const numericMax =
    maxPrice != null && maxPrice !== "" ? Number(maxPrice) : undefined;

  try {
    // log search for behaviour / training
    try {
      await behaviorService.logSearch(req.user, {
        q,
        category,
        country,
        source: "external",
        minPrice: numericMin,
        maxPrice: numericMax,
      });
    } catch (logErr) {
      console.warn("⚠️ Failed to log search:", logErr.message);
    }

    let tmEvents = [];

    // ---------- Ticketmaster ----------
    if (TICKETMASTER_API_KEY) {
      try {
        const tmRes = await axios.get(
          "https://app.ticketmaster.com/discovery/v2/events.json",
          {
            params: {
              apikey: TICKETMASTER_API_KEY,
              keyword: q || undefined,
              classificationName:
                category && category !== "All" ? category : undefined,
              size: 20,
              countryCode:
                country && country !== "World" ? country : undefined,
            },
          }
        );

        const raw = tmRes.data?._embedded?.events || [];
        tmEvents = raw.map((e) => {
          const venue = e._embedded?.venues?.[0];
          const priceRange = e.priceRanges?.[0];

          return {
            id: `tm_${e.id}`,
            source: "ticketmaster",
            title: e.name,
            url: e.url,
            date: e.dates?.start?.localDate || null,
            time: e.dates?.start?.localTime || null,
            venue: venue?.name || "",
            city: venue?.city?.name || "",
            country: venue?.country?.name || "",
            countryCode: venue?.country?.countryCode || "",
            image: e.images?.[0]?.url || null,
            category: e.classifications?.[0]?.segment?.name || "Event",
            score: "High match",
            priceMin: priceRange?.min,
            priceMax: priceRange?.max,
            lat: venue?.location?.latitude
              ? Number(venue.location.latitude)
              : undefined,
            lon: venue?.location?.longitude
              ? Number(venue.location.longitude)
              : undefined,
          };
        });
      } catch (err) {
        console.error(
          "❌ Ticketmaster error:",
          err.response?.status,
          err.response?.data || err.message
        );
      }
    } else {
      console.warn("⚠️ TICKETMASTER_API_KEY not set. Skipping Ticketmaster.");
    }

    // ---------- Merge ----------
    let merged = [...tmEvents].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date) - new Date(b.date);
    });

    // ---------- Budget filter (based on query) ----------
    if (numericMin != null || numericMax != null) {
      console.log("💰 Applying budget filter:", { numericMin, numericMax });

      merged = merged.filter((evt) => {
        if (evt.priceMin == null && evt.priceMax == null) return false;

        const min = evt.priceMin ?? evt.priceMax;
        const max = evt.priceMax ?? evt.priceMin;

        if (numericMin != null && max != null && max < numericMin) return false;
        if (numericMax != null && min != null && min > numericMax) return false;

        return true;
      });

      console.log(
        "💰 Events after budget filter:",
        merged.length,
        "of",
        tmEvents.length
      );
    }

    // ---------- Personalised ranking ----------
    merged = scoreExternalEventsForUser(req.user, merged);

    return res.json({ events: merged });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------------
// GET /api/events/recommend/live
// Live AI recommendations using fresh API data + stored preferences
// -------------------------------------------------------------------
router.get("/recommend/live", auth, async (req, res, next) => {
  console.log("🔥 /events/recommend/live for user", req.user.email);

  const user = req.user;
  const prefs = user.preferences || {};

  const categoryScores = prefs.categoryScores || {};
  const countryScores = prefs.countryScores || {};

  const topCategory = pickTopKey(categoryScores);   // e.g. "Sports" / "Music"
  const topCountryCode = pickTopKey(countryScores); // e.g. "US" / "GB"

  try {
    let tmEvents = [];

    // ---------- Ticketmaster (live) ----------
    if (TICKETMASTER_API_KEY) {
      try {
        const tmRes = await axios.get(
          "https://app.ticketmaster.com/discovery/v2/events.json",
          {
            params: {
              apikey: TICKETMASTER_API_KEY,
              size: 30,
              classificationName: topCategory || undefined,
              countryCode: topCountryCode || undefined, // if known, else global
            },
          }
        );

        const raw = tmRes.data?._embedded?.events || [];
        tmEvents = raw.map((e) => {
          const venue = e._embedded?.venues?.[0];
          const priceRange = e.priceRanges?.[0];

          return {
            id: `tm_${e.id}`,
            source: "ticketmaster",
            title: e.name,
            url: e.url,
            date: e.dates?.start?.localDate || null,
            time: e.dates?.start?.localTime || null,
            venue: venue?.name || "",
            city: venue?.city?.name || "",
            country: venue?.country?.name || "",
            countryCode: venue?.country?.countryCode || "",
            image: e.images?.[0]?.url || null,
            category: e.classifications?.[0]?.segment?.name || "Event",
            priceMin: priceRange?.min,
            priceMax: priceRange?.max,
            lat: venue?.location?.latitude
              ? Number(venue.location.latitude)
              : undefined,
            lon: venue?.location?.longitude
              ? Number(venue.location.longitude)
              : undefined,
          };
        });
      } catch (err) {
        console.error(
          "❌ Ticketmaster LIVE recommend error:",
          err.response?.status,
          err.response?.data || err.message
        );
      }
    } else {
      console.warn("⚠️ TICKETMASTER_API_KEY not set. Skipping Ticketmaster (live).");
    }

    // ---------- Merge ----------
    let merged = [...tmEvents].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date) - new Date(b.date);
    });

    // ---------- Apply AI scoring using user preferences ----------
    const personalised = scoreExternalEventsForUser(user, merged);

    return res.json({ events: personalised });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------------
// GET /api/events/recommend/me (internal DB-based recommendations)
// -------------------------------------------------------------------
router.get("/recommend/me", auth, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const recommendations = await recommendationService.recommendForUser(
      req.user,
      limit
    );
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------------
// GET /api/events/:id  (must stay last)
// -------------------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    Event.findByIdAndUpdate(event._id, { $inc: { clickCount: 1 } }).catch(() => {});

    res.json(event);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
