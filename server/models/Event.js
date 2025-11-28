// models/Event.js
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["Eventbrite", "Ticketmaster", "Other"], required: true },
    event_id: { type: String, required: true }, // provider-specific ID
    title: { type: String, required: true },
    description: { type: String },
    start_utc: { type: Date, required: true },
    end_utc: { type: Date },
    venue_name: { type: String },
    lat: { type: Number },
    lon: { type: Number },
    category: { type: String },
    price_min: { type: Number },
    price_max: { type: Number },
    url: { type: String },

    // Popularity / feedback signals for CF-lite + L2R-style scoring
    clickCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },

    ingested_at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

eventSchema.index({ title: "text", description: "text", category: "text" });
eventSchema.index({ start_utc: 1 });
eventSchema.index({ lat: 1, lon: 1 });

eventSchema.virtual("avgRating").get(function () {
  return this.ratingCount > 0 ? this.ratingSum / this.ratingCount : 0;
});

module.exports = mongoose.model("Event", eventSchema);
