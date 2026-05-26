const express = require("express");
const Subscription = require("../models/Subscription");

const router = express.Router();

const MASTER_ADMIN_EMAIL = "ks2353013@gmail.com";

function getOwnerEmail(req) {
  return (
    req.tenant?.ownerEmail ||
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    req.body?.email ||
    req.query?.email ||
    "unknown@tradeflow.local"
  )
    .toLowerCase()
    .trim();
}

function isMasterAdmin(req) {
  return getOwnerEmail(req) === MASTER_ADMIN_EMAIL;
}

router.get("/", async (req, res) => {
  try {
    if (!isMasterAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Master Admin access required"
      });
    }

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