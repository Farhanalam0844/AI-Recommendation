// services/ingestionService.js
const axios = require("axios");
const Event = require("../models/Event");

async function fetchEventbriteEvents() {
  const url = "https://www.eventbriteapi.com/v3/events/search/";
  const params = {
    "location.address": "Melbourne",
    "expand": "venue",
    "sort_by": "date"
  };

  const headers = {
    Authorization: `Bearer ${process.env.EVENTBRITE_API_KEY}`
  };

  const res = await axios.get(url, { params, headers });
  return res.data.events || [];
}

async function fetchTicketmasterEvents() {
  const url = "https://app.ticketmaster.com/discovery/v2/events.json";
  const params = {
    apikey: process.env.TICKETMASTER_API_KEY,
    city: "Melbourne",
    countryCode: "AU"
  };

  const res = await axios.get(url, { params });
  const data = res.data._embedded?.events || [];
  return data;
}

function mapEventbriteEvent(e) {
  return {
    provider: "Eventbrite",
    event_id: e.id,
    title: e.name?.text,
    description: e.description?.text,
    start_utc: e.start?.utc,
    end_utc: e.end?.utc,
    venue_name: e.venue?.name,
    lat: e.venue?.address?.latitude ? Number(e.venue.address.latitude) : undefined,
    lon: e.venue?.address?.longitude ? Number(e.venue.address.longitude) : undefined,
    category: e.category_id,
    price_min: undefined, // Eventbrite price info is separate – simplified here
    price_max: undefined,
    url: e.url
  };
}

function mapTicketmasterEvent(e) {
  const venue = e._embedded?.venues?.[0];
  const priceRange = e.priceRanges?.[0];

  return {
    provider: "Ticketmaster",
    event_id: e.id,
    title: e.name,
    description: e.info || e.pleaseNote,
    start_utc: e.dates?.start?.dateTime,
    end_utc: undefined,
    venue_name: venue?.name,
    lat: venue?.location?.latitude ? Number(venue.location.latitude) : undefined,
    lon: venue?.location?.longitude ? Number(venue.location.longitude) : undefined,
    category: e.classifications?.[0]?.segment?.name,
    price_min: priceRange?.min,
    price_max: priceRange?.max,
    url: venue?.url || e.url
  };
}

async function upsertEvents(mappedEvents) {
  for (const evt of mappedEvents) {
    if (!evt.event_id || !evt.provider) continue;

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
      ticketmasterCount: mappedTm.length
    };
  }
};

module.exports = ingestionService;
