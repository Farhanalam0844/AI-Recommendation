// routes/feedbackRoutes.js
const express = require("express");
const auth = require("../middleware/auth");
const Feedback = require("../models/Feedback");
const Event = require("../models/Event");
const behaviorService = require("../services/behaviorService");


const router = express.Router();

// POST /api/feedback
router.post("/", auth, async (req, res, next) => {
  try {
    const { eventId, rating, comment } = req.body;
    if (!eventId || !rating) {
      return res.status(400).json({ message: "eventId and rating are required" });
    }

    let feedback = await Feedback.findOne({ user: req.user._id, event: eventId });

    if (feedback) {
      // update existing feedback
      const diff = rating - feedback.rating;
      feedback.rating = rating;
      feedback.comment = comment;
      await feedback.save();

      await Event.findByIdAndUpdate(eventId, {
        $inc: { ratingSum: diff },
      });
    } else {
      feedback = await Feedback.create({
        user: req.user._id,
        event: eventId,
        rating,
        comment
      });

      await Event.findByIdAndUpdate(eventId, {
        $inc: { ratingSum: rating, ratingCount: 1, bookmarkCount: 1 }
      });
    }
await behaviorService.logRating(req.user, await Event.findById(eventId).lean(), rating);
    // Add interaction to user history (optional)
    req.user.interactions.push({
      event: eventId,
      type: "rated"
    });
    await req.user.save();

    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback/:eventId
router.get("/:eventId", async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ event: req.params.eventId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(feedback);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
