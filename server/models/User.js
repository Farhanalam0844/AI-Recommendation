// models/User.js
const mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema(
  {
    categories: [String],          // e.g. ["Music", "Comedy"]
    maxDistanceKm: { type: Number, default: 50 },
    priceMin: { type: Number, default: 0 },
    priceMax: { type: Number, default: 999999 },
    startDate: { type: Date },     // optional window
    endDate: { type: Date }
  },
  { _id: false }
);

const interactionSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    type: { type: String, enum: ["view", "click", "bookmark", "rated"], required: true },
    createdAt: { type: Date, default: Date.now }
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
    interactions: [interactionSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
