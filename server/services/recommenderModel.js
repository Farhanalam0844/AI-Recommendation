// services/recommenderModel.js

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

function buildFeaturesFromInternalEvent(evt) {
  const category = evt.category || "Other";
  const country = evt.countryCode || evt.country || "World";
  const title = evt.title || evt.name || "";
  const description = evt.description || "";
  const price = evt.price_min ?? evt.price_max ?? 0;

  const keywords = Array.from(new Set([...tokenize(title), ...tokenize(description)]));

  return { category, country, price, keywords };
}

function buildFeaturesFromExternalEvent(evt) {
  const category = evt.category || "Other";
  const country = evt.countryCode || evt.country || "World";
  const title = evt.title || "";
  const description = evt.description || "";
  const price = evt.priceMin ?? evt.priceMax ?? 0;

  const keywords = Array.from(new Set([...tokenize(title), ...tokenize(description)]));

  return { category, country, price, keywords };
}

function scorePreferences(user, features) {
  const prefs = user.preferences || {};
  const categoryScores = prefs.categoryScores || {};
  const keywordScores = prefs.keywordScores || {};
  const countryScores = prefs.countryScores || {};

  let score = 0;

  // 0) ✅ Hard preference: preferredCountry (override old learning)
  const preferred = prefs.preferredCountry ? String(prefs.preferredCountry).toUpperCase() : null;
  const evtCountry = features.country ? String(features.country).toUpperCase() : null;

  if (preferred && evtCountry) {
    if (evtCountry === preferred) score += 3.0;     // strong boost
    else score -= 0.5;                              // small penalty
  }

  // 1) Category
  const catW = categoryScores[features.category] || 0;
  score += catW * 1;

  // 2) Country learned weights (still useful, but not dominant now)
  const countryW = countryScores[features.country] || 0;
  score += countryW * 0.4;

  // 3) Keywords
  let kwSum = 0;
  for (const kw of features.keywords || []) {
    if (keywordScores[kw]) kwSum += keywordScores[kw];
  }
  if (kwSum > 0) {
    score += Math.min(kwSum / 5, 1) * 0.8;
  }

  // 4) Budget fit (safe if you don’t send min/max; it’ll just not add much)
  const priceMin = prefs.priceMin ?? 0;
  const priceMax = prefs.priceMax ?? 0;

  if (priceMax > priceMin && features.price != null) {
    const p = clamp(features.price, priceMin, priceMax);
    const mid = (priceMin + priceMax) / 2;
    const range = priceMax - priceMin || 1;
    const distFromMid = Math.abs(p - mid) / range;
    const priceScore = 1 - distFromMid * 2;
    score += priceScore;
  }

  return score;
}

module.exports = {
  buildFeaturesFromInternalEvent,
  buildFeaturesFromExternalEvent,
  scorePreferences,
};
