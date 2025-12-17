// models/Event.js
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["Eventbrite", "Ticketmaster", "Other"],
      required: true,
    },
    event_id: { type: String, required: true }, // provider-specific ID
    title: { type: String, required: true },
    description: { type: String },

    start_utc: { type: Date, required: true },
    end_utc: { type: Date },

    venue_name: { type: String },
    city: { type: String },              // ✅ NEW
    country: { type: String },           // ✅ NEW (full name if available)
    countryCode: { type: String },       // ✅ NEW (ISO2 e.g. AU, GB)

    lat: { type: Number },
    lon: { type: Number },

    category: { type: String },
    price_min: { type: Number },
    price_max: { type: Number },
    url: { type: String },

    clickCount: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },

    ingested_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

eventSchema.index({ title: "text", description: "text", category: "text" });
eventSchema.index({ start_utc: 1 });
eventSchema.index({ lat: 1, lon: 1 });

// ✅ helpful for filters/ranking
eventSchema.index({ countryCode: 1, city: 1, category: 1 });

eventSchema.virtual("avgRating").get(function () {
  return this.ratingCount > 0 ? this.ratingSum / this.ratingCount : 0;
});

module.exports = mongoose.model("Event", eventSchema);
