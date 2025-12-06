// src/pages/Search.jsx (or EventsPage.jsx)
import React, { useEffect, useState, useCallback } from "react";
import EventCard from "../components/EventCard";
import api from "../services/api";

const CATEGORY_OPTIONS = [
  { value: "All", label: "All categories" },
  { value: "Music", label: "Music" },
  { value: "Sports", label: "Sports" },
  { value: "Arts & Theatre", label: "Arts & Theatre" },
  { value: "Family", label: "Family" },
  { value: "Film", label: "Film" },
  { value: "Business", label: "Business" },
];

const COUNTRY_OPTIONS = [
  { value: "World", label: "🌍 World" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "US", label: "🇺🇸 United States" },
  { value: "GB", label: "🇬🇧 United Kingdom" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "FR", label: "🇫🇷 France" },
];

export default function EventsPage() {
  const [mode, setMode] = useState("ai"); // "ai" | "live"
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [country, setCountry] = useState("World");

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source] = useState("external");
  const [error, setError] = useState("");

  // ------------ LIVE SEARCH ------------
  const fetchEvents = useCallback(
    async ({ trigger = "initial" } = {}) => {
      try {
        setLoading(true);
        setError("");

        const params = {};

        if (q.trim()) params.q = q.trim();
        if (category && category !== "All") params.category = category;
        if (country && country !== "World") params.country = country;

        const url = source === "external" ? "/events/external" : "/events/search";

        const res = await api.get(url, { params });
        const data = res.data;
        const list = source === "external" ? data.events || [] : data || [];

        setEvents(list);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Could not load events. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [source, q, category, country]
  );

  // ------------ AI RECOMMENDATIONS (LIVE FROM APIs) ------------
  const fetchRecommended = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // New endpoint: live recommendations using APIs + preferences
      const res = await api.get("/events/recommend/live", {
        params: { limit: 30 },
      });

      // backend returns: { events: [...] }
      const data = res.data?.events || [];

      const mapped = data.map((e) => ({
        ...e,
        id: e.id,
        source: e.source || "external",
        score:
          typeof e.score === "number"
            ? `AI score: ${e.score.toFixed(2)}`
            : undefined,
      }));

      setEvents(mapped);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("Could not load AI recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------ CLICK LOGGING (for AI training) ------------
  const handleEventClick = useCallback((event) => {
    const payload = {
      eventId:
        event._id || (event.source === "internal" ? event.id : undefined),
      externalId:
        event.source !== "internal" ? event.id || event.externalId : undefined,
      source: event.source,
      title: event.title,
      url: event.url,
      category: event.category,
    };

    api.post("/behavior/click", payload).catch(() => {
      // fire-and-forget – we don't block UI
    });
  }, []);

  // ------------ useEffect to load depending on mode ------------
  useEffect(() => {
    if (mode === "ai") {
      fetchRecommended();
    } else {
      fetchEvents({ trigger: "filter-change" });
    }
  }, [mode, fetchEvents, fetchRecommended]);

  const handleCategoryChange = (e) => setCategory(e.target.value);
  const handleCountryChange = (e) => setCountry(e.target.value);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    // log search behaviour (still useful for AI)
    api
      .post("/behavior/search", {
        q,
        category,
        country,
        source: mode === "live" ? "external" : "ai",
      })
      .catch(() => {});

    if (mode === "live") {
      fetchEvents({ trigger: "text-search" });
    } else {
      fetchRecommended();
    }
  };

  const resultsLabel =
    events.length === 0
      ? "No events"
      : `${events.length} event${events.length > 1 ? "s" : ""}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30 mb-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>AI-powered event discovery</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-50">
              {mode === "ai" ? "Your Smart Event Feed" : "Discover Live Events"}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {mode === "ai"
                ? "Personalised events based on your behaviour, preferences and feedback."
                : "Search across live events from Ticketmaster & Eventbrite with powerful filters."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-1 text-xs font-medium shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => setMode("ai")}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  mode === "ai"
                    ? "bg-emerald-500 text-slate-900 shadow"
                    : "text-slate-300 hover:text-slate-50"
                }`}
              >
                AI Recommended
              </button>
              <button
                type="button"
                onClick={() => setMode("live")}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  mode === "live"
                    ? "bg-indigo-500 text-slate-900 shadow"
                    : "text-slate-300 hover:text-slate-50"
                }`}
              >
                Live Search
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Mode:{" "}
              <span className="font-semibold text-slate-200">
                {mode === "ai" ? "AI recommendations" : "Real-time external API"}
              </span>
            </p>
          </div>
        </header>

        {/* Filters / Info */}
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/40 backdrop-blur">
          {mode === "ai" ? (
            <div className="flex flex-col gap-2 text-sm text-slate-200">
              <p>
                These recommendations use your{" "}
                <span className="font-semibold text-emerald-300">
                  Preferences
                </span>{" "}
                (categories, distance, etc.) and behaviour (searches, clicks).
              </p>
              <p className="text-xs text-slate-400">
                Update your preferences on the{" "}
                <span className="font-semibold text-slate-200">
                  Preferences
                </span>{" "}
                page to steer the AI towards different types of events.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRecommended}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                >
                  🔄 Refresh recommendations
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end"
            >
              {/* Search */}
              <div className="flex-1 min-w-[220px]">
                <label
                  htmlFor="search"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Search by keyword
                </label>
                <div className="flex rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
                  <span className="mr-2 mt-[1px] text-slate-500 text-sm">
                    🔍
                  </span>
                  <input
                    id="search"
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="e.g. music festival, coding meetup, comedy show..."
                    className="block w-full bg-transparent text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="w-full md:w-48">
                <label
                  htmlFor="category"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={handleCategoryChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Category updates results instantly.
                </p>
              </div>

              {/* Country */}
              <div className="w-full md:w-48">
                <label
                  htmlFor="country"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={handleCountryChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  World = events from any country.
                </p>
              </div>

              {/* Search button */}
              <div className="flex w-full items-end justify-start md:w-auto">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-900 md:w-auto"
                >
                  Search events
                  <span className="text-base">✨</span>
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Active filters / stats */}
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-slate-300 ring-1 ring-slate-700">
              {resultsLabel}
            </span>
            {mode === "live" && (
              <>
                {q.trim() && (
                  <span className="rounded-full bg-slate-900/60 px-3 py-1 text-slate-300 ring-1 ring-slate-800">
                    🔎 Query:{" "}
                    <span className="font-medium text-slate-50">{q}</span>
                  </span>
                )}
                {category !== "All" && (
                  <span className="rounded-full bg-slate-900/60 px-3 py-1 text-slate-300 ring-1 ring-slate-800">
                    🎭 Category:{" "}
                    <span className="font-medium text-slate-50">
                      {category}
                    </span>
                  </span>
                )}
                {country !== "World" && (
                  <span className="rounded-full bg-slate-900/60 px-3 py-1 text-slate-300 ring-1 ring-slate-800">
                    🌐 Country:{" "}
                    <span className="font-medium text-slate-50">
                      {country}
                    </span>
                  </span>
                )}
              </>
            )}
          </div>
        </section>

        {/* Results */}
        <section>
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/60 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm"
                >
                  <div className="aspect-[16/9] w-full bg-slate-800" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-slate-800" />
                    <div className="h-3 w-1/2 rounded bg-slate-800" />
                    <div className="h-3 w-2/3 rounded bg-slate-800" />
                    <div className="h-8 w-24 rounded-full bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/70 px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-100">
                No events found.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {mode === "ai"
                  ? "Try refreshing recommendations or adjusting your preferences."
                  : "Try a different keyword, category, or country."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={event.id || event._id}
                  event={event}
                  onEventClick={handleEventClick}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
