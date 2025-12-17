// services/ingestionService.js
const axios = require("axios");
const Event = require("../models/Event");

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function fetchEventbriteEvents() {
  const url = "https://www.eventbriteapi.com/v3/events/search/";
  const params = {
    "location.address": "Melbourne",
    expand: "venue",
    sort_by: "date",
  };

  const headers = {
    Authorization: `Bearer ${process.env.EVENTBRITE_API_KEY}`,
  };

  const res = await axios.get(url, { params, headers });
  return res.data.events || [];
}

async function fetchTicketmasterEvents() {
  const url = "https://app.ticketmaster.com/discovery/v2/events.json";
  const params = {
    apikey: process.env.TICKETMASTER_API_KEY,
    city: "Birmingham",
    countryCode: "UK",
  };

  const res = await axios.get(url, { params });
  const data = res.data._embedded?.events || [];
  return data;
}

function mapEventbriteEvent(e) {
  const venue = e.venue || {};
  const addr = venue.address || {};

  // Eventbrite sometimes gives country as full name (localized_country_name),
  // not ISO2. If ISO2 isn't present, store full name in `country`.
  const countryName =
    addr.localized_country_name ||
    addr.country ||
    undefined;

  return {
    provider: "Eventbrite",
    event_id: e.id,
    title: e.name?.text || "Untitled",
    description: e.description?.text,

    start_utc: toDateOrNull(e.start?.utc),
    end_utc: toDateOrNull(e.end?.utc),

    venue_name: venue?.name,
    city: addr.city || undefined,
    country: countryName,
    countryCode: undefined, // usually not provided by Eventbrite in this expand

    lat: addr.latitude ? Number(addr.latitude) : undefined,
    lon: addr.longitude ? Number(addr.longitude) : undefined,

    category: e.category_id ? String(e.category_id) : undefined,

    price_min: undefined,
    price_max: undefined,

    url: e.url,
  };
}

function mapTicketmasterEvent(e) {
  const venue = e._embedded?.venues?.[0];
  const priceRange = e.priceRanges?.[0];

  return {
    provider: "Ticketmaster",
    event_id: e.id,
    title: e.name || "Untitled",
    description: e.info || e.pleaseNote,

    start_utc: toDateOrNull(e.dates?.start?.dateTime),
    end_utc: null,

    venue_name: venue?.name,
    city: venue?.city?.name || undefined,
    country: venue?.country?.name || undefined,
    countryCode: venue?.country?.countryCode || undefined,

    lat: venue?.location?.latitude ? Number(venue.location.latitude) : undefined,
    lon: venue?.location?.longitude ? Number(venue.location.longitude) : undefined,

    category: e.classifications?.[0]?.segment?.name || undefined,

    price_min: priceRange?.min,
    price_max: priceRange?.max,

    url: e.url,
  };
}

async function upsertEvents(mappedEvents) {
  for (const evt of mappedEvents) {
    if (!evt.event_id || !evt.provider) continue;
    if (!evt.start_utc) continue; // ✅ schema requires Date

    await Event.findOneAndUpdate(
      { provider: evt.provider, event_id: evt.event_id },
      { $set: evt, $setOnInsert: { ingested_at: new Date() } },
      { upsert: true }
    );
  }
}

const ingestionService = {
  async ingestAll() {
    const eb = await fetchEventbriteEvents();
    const tm = await fetchTicketmasterEvents();

    const mappedEb = eb.map(mapEventbriteEvent);
    const mappedTm = tm.map(mapTicketmasterEvent);

    await upsertEvents(mappedEb);
    await upsertEvents(mappedTm);

    return {
      eventbriteCount: mappedEb.length,
      ticketmasterCount: mappedTm.length,
    };
  },
};

module.exports = ingestionService;
