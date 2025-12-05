// services/behaviorService.js
const Event = require("../models/Event");

// ---- SMALL HELPERS ----

// safely increment a score in preferences
function incrementPrefScore(prefs, field, key, delta) {
  if (!key) return;
  if (!prefs[field]) prefs[field] = {};
  const current = prefs[field][key] || 0;
  prefs[field][key] = current + delta;
}

// very simple keyword tokenizer
function extractKeywords(q) {
  if (!q) return [];
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && t.length > 2);
}

// helper: smooth update for numeric preferences (e.g. budget)
function smoothUpdate(current, incoming, alpha = 0.3) {
  if (incoming == null || isNaN(incoming)) return current;
  if (current == null || isNaN(current)) return incoming;
  return current * (1 - alpha) + incoming * alpha;
}

// ---- PRICE CLAMPING TO AVOID CRAZY VALUES ----
const MAX_REASONABLE_PRICE = 100000; // e.g. 100k
const MIN_REASONABLE_PRICE = 0;

function clampPrice(value) {
  if (value == null || isNaN(value)) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (num < MIN_REASONABLE_PRICE) return undefined;
  if (num > MAX_REASONABLE_PRICE) return undefined;
  return num;
}

const behaviorService = {
  async logSearch(user, { q, category, country, source, minPrice, maxPrice }) {
    const prefs = user.preferences || {};

    // normalise + clamp
    const numericMin = clampPrice(
      typeof minPrice === "number" ? minPrice : minPrice != null ? Number(minPrice) : undefined
    );
    const numericMax = clampPrice(
      typeof maxPrice === "number" ? maxPrice : maxPrice != null ? Number(maxPrice) : undefined
    );

    // 1) raw interaction
    user.interactions.push({
      type: "search",
      meta: {
        q,
        category,
        country,
        source,
        minPrice: numericMin,
        maxPrice: numericMax,
      },
      createdAt: new Date(),
    });

    // 2) aggregated scores
    // search keywords (small weight)
    const tokens = extractKeywords(q);
    tokens.forEach((t) => incrementPrefScore(prefs, "keywordScores", t, 0.3));

    // selected category from search filter (medium weight)
    if (category && category !== "All") {
      incrementPrefScore(prefs, "categoryScores", category, 0.5);
    }

    // selected country (geo preference)
    if (country && country !== "World") {
      incrementPrefScore(prefs, "countryScores", country, 0.4);
    }

    // budget preference (smoothly learn user's typical range)
    if (numericMin != null) {
      prefs.priceMin = smoothUpdate(prefs.priceMin, numericMin);
    }
    if (numericMax != null) {
      prefs.priceMax = smoothUpdate(prefs.priceMax, numericMax);
    }

    user.preferences = prefs;
    user.markModified("preferences");
    await user.save();
  },

  /**
   * payload: {
   *   eventId?: string,        // internal Mongo _id
   *   externalId?: string,     // tm_xxx / eb_xxx
   *   source?: 'internal' | 'ticketmaster' | 'eventbrite',
   *   title?: string,
   *   url?: string,
   *   category?: string,
   *   country?: string
   * }
   */
  async logEventClick(user, payload) {
    const { eventId, externalId, source, title, url, category, country } =
      payload || {};

    const prefs = user.preferences || {};

    let eventDoc = null;
    if (eventId) {
      eventDoc = await Event.findById(eventId).lean();
    }

    const effectiveCategory = category || eventDoc?.category;
    const effectiveCountry = country || eventDoc?.countryCode;

    // 1) raw interaction
    const meta = {
      source,
      externalId,
      title,
      url,
      category: effectiveCategory,
      country: effectiveCountry,
      provider: eventDoc?.provider,
    };

    user.interactions.push({
      type: "click",
      event: eventDoc?._id || undefined,
      meta,
      createdAt: new Date(),
    });

    // 2) preference updates
    // strong signal that user cares about this category / country
    if (effectiveCategory) {
      incrementPrefScore(prefs, "categoryScores", effectiveCategory, 1.0);
    }

    if (effectiveCountry) {
      incrementPrefScore(prefs, "countryScores", effectiveCountry, 0.7);
    }

    // optional: learn keywords from title
    if (title) {
      extractKeywords(title).forEach((t) =>
        incrementPrefScore(prefs, "keywordScores", t, 0.5)
      );
    }

    user.preferences = prefs;
    user.markModified("preferences");
    await user.save();
  },


  async logRating(user, event, rating) {
    const prefs = user.preferences || {};

    user.interactions.push({
      type: "rated",
      event: event._id,
      meta: { rating },
      createdAt: new Date(),
    });

    // positive ratings → boost category & keywords harder
    const weight =
      rating >= 4 ? 1.5 : rating >= 3 ? 0.5 : rating <= 2 ? -0.5 : 0;

    if (event.category) {
      incrementPrefScore(prefs, "categoryScores", event.category, weight);
    }

    // optional: use title tokens as keywords
    if (event.title) {
      extractKeywords(event.title).forEach((t) =>
        incrementPrefScore(prefs, "keywordScores", t, weight * 0.3)
      );
    }

    user.preferences = prefs;
    user.markModified("preferences");
    await user.save();
  },
};

module.exports = behaviorService;
