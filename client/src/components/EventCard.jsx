// src/components/EventCard.jsx
import React from "react";

const fallbackImage =
  "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=80";

export default function EventCard({ event, onEventClick }) {
  const {
    title,
    image,
    date,
    time,
    venue,
    city,
    country,
    url,
    source,
    category,
    score,
    priceMin,   // 👈 may be undefined, but we support it
    priceMax,
  } = event;

  const dateTime =
    date && time ? `${date} · ${time}` : date || time || "Date TBD";

  const location = [venue, city, country].filter(Boolean).join(" · ");

  const tag =
    source === "ticketmaster"
      ? "Ticketmaster"
      : source === "eventbrite"
      ? "Eventbrite"
      : "From your dataset";

  const handleCardClick = () => {
    if (onEventClick) onEventClick(event);
  };

  const handleDetailsClick = (e) => {
    e.stopPropagation(); // avoid double logging (card + button)
    if (onEventClick) onEventClick(event);
    // navigation is handled by the native <a> behaviour
  };

  const priceLabel =
    priceMin != null && priceMax != null
      ? `$${priceMin} – $${priceMax}`
      : priceMin != null
      ? `From $${priceMin}`
      : priceMax != null
      ? `Up to $${priceMax}`
      : null;

  return (
    <div
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <img
          src={image || fallbackImage}
          alt={title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Source badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>{tag}</span>
        </div>

        {/* Score badge (if AI) */}
        {score && (
          <div className="absolute right-3 top-3 rounded-full bg-emerald-600/90 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
            {score}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
          {title || "Untitled Event"}
        </h3>

        {/* Meta info */}
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          {/* Date & time */}
          <p className="flex items-center gap-1">
            <span className="text-[13px]">📅</span>
            <span>{dateTime}</span>
          </p>

          {/* Location */}
          {location && (
            <p className="flex items-center gap-1 line-clamp-1">
              <span className="text-[13px]">📍</span>
              <span>{location}</span>
            </p>
          )}

     

          {/* Chips row: category + source type */}
          <div className="mt-1 flex flex-wrap gap-1">
            {category && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {category}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-600">
              {source === "ticketmaster" || source === "eventbrite"
                ? "External Event"
                : "Your Dataset"}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-between">


          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={handleDetailsClick}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              Details
              <span className="text-[13px]">↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
