// services/recommenderModel.js

// --- small helpers ---

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Build a generic feature object from an INTERNAL DB event
function buildFeaturesFromInternalEvent(evt) {
  const category = evt.category || "Other";
  const country = evt.countryCode || evt.country || "World";
  const title = evt.title || evt.name || "";
  const description = evt.description || "";
  const price =
    evt.price_min ??
    evt.price_max ??
    0;

  const keywords = Array.from(new Set([...tokenize(title), ...tokenize(description)]));

  return {
    category,
    country,
    price,
    keywords,
  };
}

// Build a generic feature object from an EXTERNAL Ticketmaster event
function buildFeaturesFromExternalEvent(evt) {
  const category = evt.category || "Other";
  const country = evt.countryCode || evt.country || "World";
  const title = evt.title || "";
  const description = evt.description || "";
  const price =
    evt.priceMin ??
    evt.priceMax ??
    0;

  const keywords = Array.from(new Set([...tokenize(title), ...tokenize(description)]));

  return {
    category,
    country,
    price,
    keywords,
  };
}

/**
 * Core AI model:
 * score = w · x using learned user weights
 *  - w = user.preferences.categoryScores / keywordScores / countryScores
 *  - x = event features (category, country, keywords, price fit)
 */
function scorePreferences(user, features) {
  const prefs = user.preferences || {};
  const categoryScores = prefs.categoryScores || {};
  const keywordScores = prefs.keywordScores || {};
  const countryScores = prefs.countryScores || {};

  let score = 0;

  // 1) Category weight
  const catW = categoryScores[features.category] || 0;
  score += catW * 1; // one-hot feature

  // 2) Country weight
  const countryW = countryScores[features.country] || 0;
  score += countryW * 0.7;

  // 3) Keyword weights
  let kwSum = 0;
  for (const kw of features.keywords || []) {
    if (keywordScores[kw]) kwSum += keywordScores[kw];
  }
  if (kwSum > 0) {
    score += Math.min(kwSum / 5, 1) * 0.8;
  }

  // 4) Budget fit (how close to user's learned priceMin/Max)
  const priceMin = prefs.priceMin ?? 0;
  const priceMax = prefs.priceMax ?? 0;

  if (priceMax > priceMin && features.price != null) {
    const p = clamp(features.price, priceMin, priceMax);
    const mid = (priceMin + priceMax) / 2;
    const range = priceMax - priceMin || 1;
    const distFromMid = Math.abs(p - mid) / range; // 0 (perfect) → ~0.5
    const priceScore = 1 - distFromMid * 2;        // about -1..1
    score += priceScore;
  }

  return score;
}

module.exports = {
  buildFeaturesFromInternalEvent,
  buildFeaturesFromExternalEvent,
  scorePreferences,
};
