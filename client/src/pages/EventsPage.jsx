// src/pages/Search.jsx (or EventsPage.jsx)
import React, { useEffect, useState, useCallback } from "react";
import EventCard from "../components/EventCard";
import api from "../services/api"; // ✅ NEW: axios instance with auth

const API_BASE_URL = "http://localhost:8000";

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
  const [mode, setMode] = useState("ai"); // "ai" | "live" ✅ NEW
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [country, setCountry] = useState("World");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source] = useState("external");
  const [error, setError] = useState("");

  // ------------ LIVE SEARCH (existing behaviour) ------------
  const fetchEvents = useCallback(
    async ({ trigger = "initial" } = {}) => {
      try {
        setLoading(true);
        setError("");

        let url;
        const params = new URLSearchParams();

        if (source === "external") {
          url = `${API_BASE_URL}/api/events/external`;
          if (q.trim()) params.set("q", q.trim());
          if (category && category !== "All") params.set("category", category);
          if (country && country !== "World") params.set("country", country);
        } else {
          url = `${API_BASE_URL}/api/events/search`;
          if (q.trim()) params.set("q", q.trim());
          if (category && category !== "All") params.set("category", category);
        }

        const fullUrl = `${url}${
          params.toString() ? `?${params.toString()}` : ""
        }`;
        console.log("🔎 Fetching events:", { fullUrl, trigger });

        const res = await fetch(fullUrl);
        if (!res.ok) {
          const text = await res.text();
          console.error("Backend error:", res.status, text);
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = await res.json();
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

  // ------------ AI RECOMMENDATIONS (NEW) ------------
  const fetchRecommended = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // uses axios instance with Authorization header
      const res = await api.get("/events/recommend/me", {
        params: { limit: 30 },
      });

      const data = res.data || [];

      // Map backend event (Mongo) -> EventCard shape
      const mapped = data.map((e) => {
        const dt = e.start_utc ? new Date(e.start_utc) : null;
        const iso = dt ? dt.toISOString() : null;
        const date = iso ? iso.slice(0, 10) : null;
        const time = iso ? iso.slice(11, 16) : null;

        return {
          ...e,
          id: e._id,
          // EventCard fields:
          title: e.title,
          date,
          time,
          venue: e.venue_name,
          city: e.city || "",
          country: e.country || "",
          image: e.image || null, // in case you later add image to DB
          source: "internal",
          category: e.category,
          // show AI score to help explain recommendations
          score:
            typeof e._score === "number"
              ? `AI score: ${e._score.toFixed(2)}`
              : undefined,
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("Could not load AI recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------ useEffect to load depending on mode ------------
  useEffect(() => {
    if (mode === "ai") {
      fetchRecommended();
    } else {
      fetchEvents({ trigger: "filter-change" });
    }
  }, [mode, fetchEvents, fetchRecommended]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  const handleCountryChange = (e) => {
    setCountry(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (mode === "live") {
      fetchEvents({ trigger: "text-search" });
    } else {
      // in AI mode, search bar is not used (recommendations based on prefs)
      fetchRecommended();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {mode === "ai" ? "AI-Recommended Events" : "Discover Events"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {mode === "ai"
                ? "Personalised events based on your saved preferences, location, and feedback."
                : "Search across live events from Ticketmaster & Eventbrite."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-medium shadow-sm">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`px-3 py-1.5 rounded-full ${
                mode === "ai"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600"
              }`}
            >
              AI Recommended
            </button>
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`px-3 py-1.5 rounded-full ${
                mode === "live"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600"
              }`}
            >
              Live Search
            </button>
          </div>
        </header>

        {/* Filters / Info */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          {mode === "ai" ? (
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              <p>
                These recommendations use your{" "}
                <span className="font-semibold">Preferences</span> (categories,
                distance, etc.) and feedback (ratings, clicks, bookmarks).
              </p>
              <p className="text-xs text-slate-500">
                Update your preferences on the{" "}
                <span className="font-semibold">Preferences</span> page to see
                different results.
              </p>
              <button
                type="button"
                onClick={fetchRecommended}
                className="mt-2 inline-flex w-fit items-center justify-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                🔄 Refresh recommendations
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap"
            >
              {/* Search */}
              <div className="flex-1 min-w-[220px]">
                <label
                  htmlFor="search"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Search by keyword
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                  <input
                    id="search"
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="e.g. music festival, coding meetup, comedy show..."
                    className="block w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="w-full md:w-56">
                <label
                  htmlFor="category"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={handleCategoryChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Category updates results instantly.
                </p>
              </div>

              {/* Country */}
              <div className="w-full md:w-56">
                <label
                  htmlFor="country"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={handleCountryChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  World = events from any country.
                </p>
              </div>

              {/* Search button */}
              <div className="flex w-full items-end justify-start md:w-auto">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 md:w-auto"
                >
                  🔍 Search
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Results */}
        <section>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white/80 shadow-sm"
                >
                  <div className="aspect-[16/9] w-full bg-slate-200" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                    <div className="h-3 w-2/3 rounded bg-slate-200" />
                    <div className="h-8 w-24 rounded-full bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-900">
                No events found.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {mode === "ai"
                  ? "Try updating your preferences or refreshing recommendations."
                  : "Try a different keyword, category, or country."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id || event._id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
