// models/User.js
const mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema(
  {
    categories: [String],
    location: { type: String },
    maxDistanceKm: { type: Number, default: 50 },
    priceMin: { type: Number, default: 0 },
    priceMax: { type: Number, default: 999999 },
    startDate: { type: Date },
    endDate: { type: Date },

    // 🔥 BEHAVIOURAL SIGNALS (dynamic, updated from user actions)
    categoryScores: {
      type: Object,
      default: {}, // e.g. { "Music": 4.5, "Sports": 2 }
    },
    keywordScores: {
      type: Object,
      default: {}, // e.g. { "coldplay": 3, "hackathon": 1 }
    },
    countryScores: {
      type: Object,
      default: {}, // e.g. { "AU": 5, "GB": 2 }
    },
  },
  { _id: false }
);

const interactionSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    type: {
      type: String,
      enum: ["view", "click", "rated", "search"],
      required: true,
    },
    meta: {
      type: Object, // flexible payload (query, filters, source)
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    city: { type: String },
    lat: { type: Number },
    lon: { type: Number },
    preferences: { type: preferenceSchema, default: () => ({}) },
    interactions: [interactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
