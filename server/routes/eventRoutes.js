// backend/routes/eventRoutes.js
const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const Event = require("../models/Event");
const recommendationService = require("../services/recommendationService");
const behaviorService = require("../services/behaviorService");
const {
  buildFeaturesFromExternalEvent,
  scorePreferences,
} = require("../services/recommenderModel");

const router = express.Router();

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
console.log("🚀 TICKETMASTER_API_KEY loaded?", !!TICKETMASTER_API_KEY);

// -------------------- WORLD (Multi-country) Settings --------------------
const WORLD_COUNTRY_CODES = [
  "US",
  "CA",
  "GB",
  "AU",
  "NZ",
  "IE",
  "DE",
  "FR",
  "NL",
  "ES",
  "IT",
  "SE",
  "NO",
  "DK",
  "CH",
  "AT",
  "BE",
  "AE",
  "SA",
  "ZA",
  "IN",
  "PK",
  "BD",
  "SG",
  "MY",
  "TH",
  "PH",
  "JP",
  "KR",
  "BR",
  "MX",
];

function normalizeCountryCode(input) {
  const v = String(input || "").trim();
  if (!v) return undefined;

  const low = v.toLowerCase();
  if (["world", "all", "global"].includes(low)) return undefined;

  const iso2 = v.toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2)) return undefined;
  return iso2;
}

function isWorldMode(input) {
  const v = String(input || "").trim();
  if (!v) return true;
  return ["world", "all", "global"].includes(v.toLowerCase());
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

function scoreExternalEventsForUser(user, events) {
  if (!user) return events;

  const prefs = user.preferences || {};
  const nowMs = Date.now();

  const userLat = Number.isFinite(user.lat) ? user.lat : null;
  const userLon = Number.isFinite(user.lon) ? user.lon : null;

  const maxDistanceKm = prefs.maxDistanceKm || 50;
  const maxHoursWindow = 24 * 30;

  return events
    .map((evt) => {
      const features = buildFeaturesFromExternalEvent(evt);
      let score = scorePreferences(user, features);

      let ctxScore = 0;

      if (
        evt.lat != null &&
        evt.lon != null &&
        userLat != null &&
        userLon != null
      ) {
        const d = distanceKm(userLat, userLon, evt.lat, evt.lon);
        if (d != null && d <= maxDistanceKm) {
          ctxScore += 0.4 * (1 - d / maxDistanceKm);
        }
      }

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

function mapTicketmasterEvent(e) {
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
    lat: venue?.location?.latitude ? Number(venue.location.latitude) : undefined,
    lon: venue?.location?.longitude ? Number(venue.location.longitude) : undefined,
  };
}

async function fetchTicketmaster({ keyword, category, countryCode, size = 100 }) {
  if (!TICKETMASTER_API_KEY) return [];

  const params = { apikey: TICKETMASTER_API_KEY, size };
  if (keyword) params.keyword = keyword;
  if (category) params.classificationName = category;

  const iso2 = normalizeCountryCode(countryCode);
  if (iso2) params.countryCode = iso2;

  const tmRes = await axios.get(
    "https://app.ticketmaster.com/discovery/v2/events.json",
    { params }
  );

  const raw = tmRes.data?._embedded?.events || [];
  return raw.map(mapTicketmasterEvent);
}

async function fetchTicketmasterWorld({ keyword, category, sizePerCountry = 50 }) {
  if (!TICKETMASTER_API_KEY) return [];

  const calls = WORLD_COUNTRY_CODES.map((cc) =>
    fetchTicketmaster({
      keyword,
      category,
      countryCode: cc,
      size: sizePerCountry,
    }).catch((err) => {
      console.warn("⚠️ TM world fetch failed:", cc, err.response?.status || err.message);
      return [];
    })
  );

  const results = await Promise.all(calls);
  const all = results.flat();

  const seen = new Set();
  const deduped = [];
  for (const evt of all) {
    if (!evt?.id) continue;
    if (seen.has(evt.id)) continue;
    seen.add(evt.id);
    deduped.push(evt);
  }
  return deduped;
}

// -------------------------------------------------------------------
// GET /api/events/external
// -------------------------------------------------------------------
router.get("/external", auth, async (req, res, next) => {
  console.log("🧪 /events/external query:", req.query);

  const { q, category, country, minPrice, maxPrice } = req.query;

  const numericMin = minPrice != null && minPrice !== "" ? Number(minPrice) : undefined;
  const numericMax = maxPrice != null && maxPrice !== "" ? Number(maxPrice) : undefined;

  try {
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

    const tmCategory = category && category !== "All" ? category : undefined;
    const worldMode = isWorldMode(country);
    const tmCountryCode = normalizeCountryCode(country);

    let tmEvents = [];

    if (TICKETMASTER_API_KEY) {
      try {
        if (worldMode) {
          tmEvents = await fetchTicketmasterWorld({
            keyword: q || undefined,
            category: tmCategory,
            sizePerCountry: 50,
          });
        } else {
          tmEvents = await fetchTicketmaster({
            keyword: q || undefined,
            category: tmCategory,
            countryCode: tmCountryCode,
            size: 100,
          });
        }
      } catch (err) {
        console.error("❌ Ticketmaster error:", err.response?.status, err.response?.data || err.message);
      }
    }

    let merged = [...tmEvents].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date) - new Date(b.date);
    });

    // Budget filter stays here if you still use it; you said you removed budget from UI,
    // but this route can keep it safely (it does nothing if min/max not sent).
    if (numericMin != null || numericMax != null) {
      merged = merged.filter((evt) => {
        if (evt.priceMin == null && evt.priceMax == null) return false;

        const min = evt.priceMin ?? evt.priceMax;
        const max = evt.priceMax ?? evt.priceMin;

        if (numericMin != null && max != null && max < numericMin) return false;
        if (numericMax != null && min != null && min > numericMax) return false;
        return true;
      });
    }

    merged = scoreExternalEventsForUser(req.user, merged);
    return res.json({ events: merged });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------------
// GET /api/events/recommend/live  ✅ FIX: prefer preferredCountry
// -------------------------------------------------------------------
// -------------------------------------------------------------------
// GET /api/events/recommend/live
// ✅ True AI behavior: fetch WORLD candidates first, then rank by prefs
// -------------------------------------------------------------------
router.get("/recommend/live", auth, async (req, res, next) => {
  console.log("🔥 /events/recommend/live for user", req.user.email);

  const user = req.user;
  const prefs = user.preferences || {};

  const categoryScores = prefs.categoryScores || {};
  const countryScores = prefs.countryScores || {};

  const topCategory = pickTopKey(categoryScores);

  // Hard override (if set) - used as a strong BOOST in scoring, not as a fetch filter
  const preferredCountry =
    prefs.preferredCountry || pickTopKey(countryScores) || null;

  try {
    // 1) Fetch broad pool (WORLD) so model can actually choose
    let tmEvents = [];
    try {
      tmEvents = await fetchTicketmasterWorld({
        keyword: undefined,
        category: topCategory || null, // use top category to keep pool relevant
        sizePerCountry: 30,
      });
    } catch (err) {
      console.error("❌ TM error (WORLD):", err.message);
    }

    // 2) If world returned nothing, fallback to single fetch without country
    if (!tmEvents.length) {
      try {
        tmEvents = await fetchTicketmaster({
          keyword: undefined,
          category: topCategory || null,
          countryCode: null,
          size: 100,
        });
      } catch (err) {
        console.error("❌ TM error (fallback):", err.message);
      }
    }

    // 3) Ensure preferredCountry is applied strongly during scoring
    // (scorePreferences already uses prefs.preferredCountry)
    if (preferredCountry) {
      user.preferences = user.preferences || {};
      user.preferences.preferredCountry = preferredCountry;
    }

    // sort by date then score
    let merged = [...tmEvents].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date) - new Date(b.date);
    });

    const personalised = scoreExternalEventsForUser(user, merged);

    // OPTIONAL (recommended): diversify results so top 20 isn't all one country
    // Keep top 5 from preferred country, then fill remaining with best others
    const limit = Number(req.query.limit) || 20;
    const prefISO2 = preferredCountry ? String(preferredCountry).toUpperCase() : null;

    if (prefISO2) {
      const fromPref = [];
      const fromOther = [];

      for (const e of personalised) {
        const cc = e.countryCode ? String(e.countryCode).toUpperCase() : "";
        if (cc === prefISO2) fromPref.push(e);
        else fromOther.push(e);
      }

      const out = [
        ...fromPref.slice(0, 5),
        ...fromOther.slice(0, Math.max(0, limit - 5)),
      ];

      return res.json({ events: out.slice(0, limit) });
    }

    return res.json({ events: personalised.slice(0, limit) });
  } catch (err) {
    next(err);
  }
});


// -------------------------------------------------------------------
// Internal DB recommend (unchanged)
// -------------------------------------------------------------------
router.get("/recommend/me", auth, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const recommendations = await recommendationService.recommendForUser(req.user, limit);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

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
