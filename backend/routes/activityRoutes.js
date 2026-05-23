const express = require("express");
const Activity = require("../models/Activity");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, title, message, source, priority, metadata } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message are required"
      });
    }

    const activity = await Activity.create({
      type,
      title,
      message,
      source,
      priority,
      metadata
    });

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ message: "Failed to save activity" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Activity.findByIdAndDelete(req.params.id);
    res.json({ message: "Activity deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete activity" });
  }
});

router.delete("/", async (req, res) => {
  try {
    await Activity.deleteMany({});
    res.json({ message: "All activities cleared" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear activities" });
  }
});

module.exports = router;