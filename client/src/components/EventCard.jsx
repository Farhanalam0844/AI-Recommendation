// src/components/EventCard.jsx
import React from "react";

const fallbackImage =
  "https://images.pexels.com/photos/1763067/pexels-photo-1763067.jpeg?auto=compress&cs=tinysrgb&w=1200";

export default function EventCard({ event }) {
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
  } = event;

  const dateTime =
    date && time ? `${date} · ${time}` : date || time || "Date TBD";

  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <img
          src={image || fallbackImage}
          alt={title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Source badge */}
        <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {source === "ticketmaster"
            ? "Ticketmaster"
            : source === "eventbrite"
            ? "Eventbrite"
            : "Internal"}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
          {title || "Untitled Event"}
        </h3>

        {/* Meta */}
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          <p className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {dateTime}
          </p>
          {(venue || city || country) && (
            <p className="truncate">
              <span className="font-medium">Location: </span>
              {[venue, city, country].filter(Boolean).join(", ")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {category && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                {category}
              </span>
            )}
            {score && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                {score}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            {source === "ticketmaster" || source === "eventbrite"
              ? "External event"
              : "From your dataset"}
          </span>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              onClick={() => {
                // You can later hook click tracking here if needed
              }}
            >
              View details
              <span className="text-[13px]">↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
