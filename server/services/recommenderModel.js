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

function normalizeIso2(input) {
  const v = String(input || "").trim().toUpperCase();
  if (!v) return null;
  if (!/^[A-Z]{2}$/.test(v)) return null;
  if (["WORLD", "ALL", "GLOBAL"].includes(v)) return null;
  return v;
}

// ✅ Internal DB events (Event model)
function buildFeaturesFromInternalEvent(evt) {
  const category = evt.category || "Other";
  const countryCode = normalizeIso2(evt.countryCode) || null;
  const countryName = evt.country ? String(evt.country) : null;

  const title = evt.title || evt.name || "";
  const description = evt.description || "";
  const price = evt.price_min ?? evt.price_max ?? null;

  const keywords = Array.from(new Set([...tokenize(title), ...tokenize(description)]));

  return { category, countryCode, countryName, price, keywords };
}

// ✅ External (Ticketmaster mapped objects)
function buildFeaturesFromExternalEvent(evt) {
  const category = evt.category || "Other";
  const countryCode = normalizeIso2(evt.countryCode) || null;
  const countryName = evt.country ? String(evt.country) : null;

  const title = evt.title || "";
  const description = evt.description || "";

  // ✅ supports BOTH naming conventions
  const price =
    evt.priceMin ??
    evt.priceMax ??
    evt.price_min ??
    evt.price_max ??
    null;

  const keywords = Array.from(new Set([...tokenize(title), ...tokenize(description)]));

  return { category, countryCode, countryName, price, keywords };
}

function scorePreferences(user, features) {
  const prefs = user.preferences || {};
  const categoryScores = prefs.categoryScores || {};
  const keywordScores = prefs.keywordScores || {};
  const countryScores = prefs.countryScores || {};

  let score = 0;

  // 0) Hard preference: preferredCountry (ONLY if user explicitly set it in preferences)
  const preferred = normalizeIso2(prefs.preferredCountry);
  const evtCC = features.countryCode;

  if (preferred && evtCC) {
    if (evtCC === preferred) score += 3.0;
    else score -= 0.5;
  }

  // 1) Category
  score += (categoryScores[features.category] || 0) * 1.0;

  // 2) Country learned weights (ISO2 only)
  if (evtCC) {
    score += (countryScores[evtCC] || 0) * 0.4;
  }

  // 3) Keywords
  let kwSum = 0;
  for (const kw of features.keywords || []) {
    if (keywordScores[kw]) kwSum += keywordScores[kw];
  }
  if (kwSum > 0) score += Math.min(kwSum / 5, 1) * 0.8;

  // 4) Budget fit (only if price known)
  const priceMin = prefs.priceMin ?? 0;
  const priceMax = prefs.priceMax ?? 0;

  if (priceMax > priceMin && features.price != null) {
    const p = clamp(features.price, priceMin, priceMax);
    const mid = (priceMin + priceMax) / 2;
    const range = priceMax - priceMin || 1;
    const distFromMid = Math.abs(p - mid) / range;
    score += 1 - distFromMid * 2;
  }

  return score;
}

module.exports = {
  buildFeaturesFromInternalEvent,
  buildFeaturesFromExternalEvent,
  scorePreferences,
};
