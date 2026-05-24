const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const notifications =
      await Notification.find().sort({
        createdAt: -1
      });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch notifications"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const notification =
      await Notification.create(req.body);

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create notification"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const notification =
      await Notification.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found"
      });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update notification"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const notification =
      await Notification.findByIdAndDelete(
        req.params.id
      );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found"
      });
    }

    res.json({
      message: "Notification deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete notification"
    });
  }
});

module.exports = router;