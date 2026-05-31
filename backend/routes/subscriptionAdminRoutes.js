const express = require("express");
const Subscription = require("../models/Subscription");
const { requireMasterAdmin } = require("../middleware/permissionMiddleware");

const router = express.Router();

router.get("/", requireMasterAdmin, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({})
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
      error: error.message
    });
  }
});

module.exports = router;
