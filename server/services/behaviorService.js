// services/behaviorService.js
const Event = require("../models/Event");

function incrementPrefScore(prefs, field, key, delta) {
  if (!key) return;
  if (!prefs[field]) prefs[field] = {};
  const current = prefs[field][key] || 0;
  prefs[field][key] = current + delta;
}

function extractKeywords(q) {
  if (!q) return [];
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && t.length > 2);
}

function smoothUpdate(current, incoming, alpha = 0.3) {
  if (incoming == null || isNaN(incoming)) return current;
  if (current == null || isNaN(current)) return incoming;
  return current * (1 - alpha) + incoming * alpha;
}

const MAX_REASONABLE_PRICE = 100000;
const MIN_REASONABLE_PRICE = 0;

function clampPrice(value) {
  if (value == null || isNaN(value)) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (num < MIN_REASONABLE_PRICE) return undefined;
  if (num > MAX_REASONABLE_PRICE) return undefined;
  return num;
}

function normalizeCountryCode(input) {
  const v = String(input || "").trim();
  if (!v) return undefined;
  const low = v.toLowerCase();
  if (["world", "all", "global"].includes(low)) return undefined;
  const iso2 = v.toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2)) return undefined;
  return iso2;
}

function normalizeCategory(input) {
  const v = String(input || "").trim();
  if (!v) return undefined;
  if (["all", "All", "ALL"].includes(v)) return undefined;
  return v;
}

// ✅ Unified preference updates
function setPreferredCountry(prefs, iso2) {
  if (!iso2) return;
  // make live behaviour behave exactly like manual override
  prefs.preferredCountry = iso2;
}

function setCategoriesFromSingle(prefs, category) {
  if (!category) return;
  // make live behaviour behave exactly like manual categories
  // (manual is array; live gives a single category)
  prefs.categories = [category];
}

const behaviorService = {
  async logSearch(user, { q, category, country, source, minPrice, maxPrice }) {
    const prefs = user.preferences || {};

    const numericMin = clampPrice(
      typeof minPrice === "number" ? minPrice : minPrice != null ? Number(minPrice) : undefined
    );
    const numericMax = clampPrice(
      typeof maxPrice === "number" ? maxPrice : maxPrice != null ? Number(maxPrice) : undefined
    );

    user.interactions.push({
      type: "search",
      meta: { q, category, country, source, minPrice: numericMin, maxPrice: numericMax },
      createdAt: new Date(),
    });

    // keyword learning
    const tokens = extractKeywords(q);
    tokens.forEach((t) => incrementPrefScore(prefs, "keywordScores", t, 0.3));

    // category learning + ✅ unify to manual field
    const cat = normalizeCategory(category);
    if (cat) {
      incrementPrefScore(prefs, "categoryScores", cat, 0.5);
      setCategoriesFromSingle(prefs, cat);
    }

    // country learning + ✅ unify to manual field
    const iso2 = normalizeCountryCode(country);
    if (iso2) {
      incrementPrefScore(prefs, "countryScores", iso2, 0.4);

      // mild dampening so one old country doesn’t dominate forever
      const map = prefs.countryScores || {};
      for (const k of Object.keys(map)) {
        if (k !== iso2) map[k] *= 0.97;
      }
      prefs.countryScores = map;

      // ✅ make live behaviour behave like manual override
      setPreferredCountry(prefs, iso2);
    }

    // price learning
    if (numericMin != null) prefs.priceMin = smoothUpdate(prefs.priceMin, numericMin);
    if (numericMax != null) prefs.priceMax = smoothUpdate(prefs.priceMax, numericMax);

    user.preferences = prefs;
    user.markModified("preferences");
    await user.save();
  },

  async logEventClick(user, payload) {
    const { eventId, externalId, source, title, url, category, country } = payload || {};
    const prefs = user.preferences || {};

    let eventDoc = null;
    if (eventId) eventDoc = await Event.findById(eventId).lean();

    const effectiveCategory = normalizeCategory(category || eventDoc?.category);

    // normalize click country (external events should send ISO2 countryCode)
    const effectiveCountry =
      normalizeCountryCode(country) || normalizeCountryCode(eventDoc?.countryCode);

    user.interactions.push({
      type: "click",
      event: eventDoc?._id || undefined,
      meta: {
        source,
        externalId,
        title,
        url,
        category: effectiveCategory,
        country: effectiveCountry,
        provider: eventDoc?.provider,
      },
      createdAt: new Date(),
    });

    // category learning + ✅ unify to manual field
    if (effectiveCategory) {
      incrementPrefScore(prefs, "categoryScores", effectiveCategory, 1.0);
      setCategoriesFromSingle(prefs, effectiveCategory);
    }

    // country learning + ✅ unify to manual field
    if (effectiveCountry) {
      incrementPrefScore(prefs, "countryScores", effectiveCountry, 0.7);

      // mild dampening of others
      const map = prefs.countryScores || {};
      for (const k of Object.keys(map)) {
        if (k !== effectiveCountry) map[k] *= 0.98;
      }
      prefs.countryScores = map;

      // ✅ make live behaviour behave like manual override
      setPreferredCountry(prefs, effectiveCountry);
    }

    // title keywords
    if (title) {
      extractKeywords(title).forEach((t) => incrementPrefScore(prefs, "keywordScores", t, 0.5));
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

    const weight = rating >= 4 ? 1.5 : rating >= 3 ? 0.5 : rating <= 2 ? -0.5 : 0;

    if (event.category) {
      incrementPrefScore(prefs, "categoryScores", event.category, weight);
      // ✅ unify categories too (rating is a strong preference signal)
      if (weight > 0) setCategoriesFromSingle(prefs, event.category);
    }

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
