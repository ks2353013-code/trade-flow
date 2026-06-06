const express = require("express");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const { requireMasterAdmin } = require("../middleware/permissionMiddleware");

const router = express.Router();

const PLAN_ENTITLEMENTS = {
  Free: {
    aiLimit: 0,
    supplierLimit: 25,
    dealLimit: 10,
    workspaceLimit: 1,
    employeeLimit: 1
  },
  Starter: {
    aiLimit: 20,
    supplierLimit: 200,
    dealLimit: 50,
    workspaceLimit: 1,
    employeeLimit: 3
  },
  "Pro Exporter": {
    aiLimit: 1000,
    supplierLimit: 2000,
    dealLimit: 1000,
    workspaceLimit: 5,
    employeeLimit: 25
  },
  "Enterprise AI OS": {
    aiLimit: 10000,
    supplierLimit: 10000,
    dealLimit: 5000,
    workspaceLimit: 100,
    employeeLimit: 200
  }
};

function getEmail(req) {
  return String(req.user?.email || "").toLowerCase().trim();
}

router.get("/subscription", async (req, res) => {
  try {
    const email = getEmail(req);

    let subscription = await Subscription.findOne({ email }).sort({
      createdAt: -1
    });

    if (!subscription) {
      subscription = await Subscription.create({
        email,
        plan: "Starter",
        status: "Active",
        entitlements: PLAN_ENTITLEMENTS.Starter
      });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch subscription" });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const email = getEmail(req);

    const payments = await Payment.find({ email })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

router.post("/activate", (req, res) => {
  res.status(403).json({
    success: false,
    message: "Direct billing activation is disabled. Use verified Razorpay payment routes."
  });
});

router.post("/set-free", requireMasterAdmin, async (req, res) => {
  try {
    const email = String(req.body?.email || req.user?.email || "")
      .toLowerCase()
      .trim();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { email },
      {
        email,
        plan: "Free",
        status: "Active",
        startsAt: new Date(),
        expiresAt: null,
        entitlements: PLAN_ENTITLEMENTS.Free
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to set free plan" });
  }
});

module.exports = router;
