// src/pages/Search.jsx
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
  { value: "NZ", label: "🇳🇿 New Zealand" },
  { value: "IE", label: "🇮🇪 Ireland" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "ES", label: "🇪🇸 Spain" },
  { value: "IT", label: "🇮🇹 Italy" },
  { value: "SE", label: "🇸🇪 Sweden" },
  { value: "NO", label: "🇳🇴 Norway" },
  { value: "DK", label: "🇩🇰 Denmark" },
  { value: "CH", label: "🇨🇭 Switzerland" },
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "AE", label: "🇦🇪 United Arab Emirates" },
  { value: "SA", label: "🇸🇦 Saudi Arabia" },
  { value: "ZA", label: "🇿🇦 South Africa" },
  { value: "IN", label: "🇮🇳 India" },
  { value: "PK", label: "🇵🇰 Pakistan" },
  { value: "BD", label: "🇧🇩 Bangladesh" },
  { value: "SG", label: "🇸🇬 Singapore" },
  { value: "MY", label: "🇲🇾 Malaysia" },
  { value: "TH", label: "🇹🇭 Thailand" },
  { value: "PH", label: "🇵🇭 Philippines" },
  { value: "JP", label: "🇯🇵 Japan" },
  { value: "KR", label: "🇰🇷 South Korea" },
  { value: "BR", label: "🇧🇷 Brazil" },
  { value: "MX", label: "🇲🇽 Mexico" },
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

  const fetchEvents = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const params = {};
        if (q.trim()) params.q = q.trim();
        if (category && category !== "All") params.category = category;

        // ✅ always send country, including "World"
        if (country) params.country = country;

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

  const fetchRecommended = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/events/recommend/live", { params: { limit: 30 } });
      const data = res.data?.events || [];

      const mapped = data.map((e) => ({
        ...e,
        id: e.id,
        source: e.source || "external",
        score: typeof e.score === "number" ? `AI score: ${e.score.toFixed(2)}` : undefined,
      }));

      setEvents(mapped);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("Could not load AI recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ important: include country on click payload so learning works
  const handleEventClick = useCallback((event) => {
    const payload = {
      eventId: event._id || (event.source === "internal" ? event.id : undefined),
      externalId: event.source !== "internal" ? event.id || event.externalId : undefined,
      source: event.source,
      title: event.title,
      url: event.url,
      category: event.category,
      country: event.countryCode || event.country, // ✅ key fix
    };

    api.post("/behavior/click", payload).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === "ai") fetchRecommended();
    else fetchEvents();
  }, [mode, fetchEvents, fetchRecommended]);

  const handleCategoryChange = (e) => setCategory(e.target.value);
  const handleCountryChange = (e) => setCountry(e.target.value);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    api.post("/behavior/search", {
      q,
      category,
      country,
      source: mode === "live" ? "external" : "ai",
    }).catch(() => {});

    if (mode === "live") fetchEvents();
    else fetchRecommended();
  };

  const resultsLabel =
    events.length === 0 ? "No events" : `${events.length} event${events.length > 1 ? "s" : ""}`;

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
                : "Search across live events from Ticketmaster with powerful filters."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-1 text-xs font-medium shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => setMode("ai")}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  mode === "ai" ? "bg-emerald-500 text-slate-900 shadow" : "text-slate-300 hover:text-slate-50"
                }`}
              >
                AI Recommended
              </button>
              <button
                type="button"
                onClick={() => setMode("live")}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  mode === "live" ? "bg-indigo-500 text-slate-900 shadow" : "text-slate-300 hover:text-slate-50"
                }`}
              >
                Live Search
              </button>
            </div>
          </div>
        </header>

        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/40 backdrop-blur">
          {mode === "live" ? (
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end"
            >
              <div className="flex-1 min-w-[220px]">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Search by keyword
                </label>
                <div className="flex rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="e.g. music festival..."
                    className="block w-full bg-transparent text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Category
                </label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-48">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Country
                </label>
                <select
                  value={country}
                  onChange={handleCountryChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex w-full items-end justify-start md:w-auto">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-900 md:w-auto"
                >
                  Search
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchRecommended}
                className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900"
              >
                🔄 Refresh recommendations
              </button>
              <span className="text-xs text-slate-400">{resultsLabel}</span>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/60 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-300">Loading…</div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/70 px-6 py-12 text-center text-slate-200">
            No events found.
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
      </div>
    </div>
  );
}
