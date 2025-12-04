// routes/eventRoutes.js
const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const Event = require("../models/Event");
const recommendationService = require("../services/recommendationService");

const router = express.Router();

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;
// GET /api/events/search
// query params: q, category, minPrice, maxPrice, startDate, endDate
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
// ✅ NEW: GET /api/events/external with budget support
router.get("/external", async (req, res) => {
   console.log("🧪 /events/external query:", req.query);
   
 
  const { q, category, country, minPrice, maxPrice } = req.query;

  const numericMin =
    minPrice != null && minPrice !== "" ? Number(minPrice) : undefined;
  const numericMax =
    maxPrice != null && maxPrice !== "" ? Number(maxPrice) : undefined;

  let tmEvents = [];
  let ebEvents = [];

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
            // World = no countryCode => global
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
          image: e.images?.[0]?.url || null,
          category: e.classifications?.[0]?.segment?.name || "Event",
          score: "High match",
          priceMin: priceRange?.min,
          priceMax: priceRange?.max,
        };
      });
    } catch (err) {
      console.error(
        "❌ Ticketmaster error:",
        err.response?.status,
        err.response?.data || err.message
      );
      // don’t throw → just skip Ticketmaster
    }
  } else {
    console.warn("⚠️ TICKETMASTER_API_KEY not set. Skipping Ticketmaster.");
  }

  // ---------- Eventbrite ----------
  if (EVENTBRITE_TOKEN) {
    try {
      const ebParams = {
        q: q || undefined,
        expand: "venue",
        page_size: 20,
      };

      ebParams["location.address"] =
        country && country !== "World" ? country : "Melbourne";

      const ebRes = await axios.get(
        "https://www.eventbriteapi.com/v3/events/search/",
        {
          headers: {
            Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
          },
          params: ebParams,
        }
      );

      const raw = ebRes.data?.events || [];
      ebEvents = raw.map((e) => {
        const venue = e.venue;
        const start = e.start || {};
        // Eventbrite price is more complex → we skip price filtering here
        return {
          id: `eb_${e.id}`,
          source: "eventbrite",
          title: e.name?.text || "Untitled Event",
          url: e.url,
          date: start.local?.slice(0, 10) || null,
          time: start.local?.slice(11, 16) || null,
          venue: venue?.name || "",
          city: venue?.address?.city || "",
          country: venue?.address?.country || "",
          image: e.logo?.url || null,
          category: e.category_id || "Event",
          score: "Medium match",
          priceMin: undefined,
          priceMax: undefined,
        };
      });
    } catch (err) {
      console.error(
        "❌ Eventbrite error:",
        err.response?.status,
        err.response?.data || err.message
      );
      // again, don't throw – just skip Eventbrite
    }
  } else {
    console.warn("⚠️ EVENTBRITE_TOKEN not set. Skipping Eventbrite.");
  }

  // ---------- Merge ----------
  let merged = [...tmEvents, ...ebEvents].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(a.date) - new Date(b.date);
  });


// ---------- Budget filter ----------
if (numericMin != null || numericMax != null) {
  console.log("💰 Applying budget filter:", { numericMin, numericMax });

  merged = merged.filter((evt) => {
    // If event has no price info at all, HIDE it when a budget is set
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
    tmEvents.length + ebEvents.length
  );
}


  return res.json({ events: merged });
});



// GET /api/events/recommend/me

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


// ⚠️ KEEP THIS LAST – catches /:id
// GET /api/events/:id
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
