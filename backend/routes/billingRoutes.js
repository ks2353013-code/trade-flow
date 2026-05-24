const express = require("express");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");

const router = express.Router();

const PLAN_ENTITLEMENTS = {
  Free: {
    aiLimit: 20,
    supplierLimit: 25,
    dealLimit: 20,
    workspaceLimit: 1,
    employeeLimit: 1
  },
  Pro: {
    aiLimit: 500,
    supplierLimit: 500,
    dealLimit: 300,
    workspaceLimit: 5,
    employeeLimit: 10
  },
  Enterprise: {
    aiLimit: 10000,
    supplierLimit: 10000,
    dealLimit: 5000,
    workspaceLimit: 100,
    employeeLimit: 200
  }
};

function getEmail(req) {
  return (
    req.body?.email ||
    req.query?.email ||
    req.headers["x-user-email"] ||
    "unknown@tradeflow.local"
  )
    .toString()
    .toLowerCase()
    .trim();
}

function getExpiryDate(months = 1) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
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
        plan: "Free",
        status: "Active",
        entitlements: PLAN_ENTITLEMENTS.Free
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

router.post("/activate", async (req, res) => {
  try {
    const {
      email,
      plan,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      amount,
      currency
    } = req.body;

    if (!email || !plan || !["Pro", "Enterprise"].includes(plan)) {
      return res.status(400).json({ message: "Invalid activation request" });
    }

    await Payment.create({
      email: email.toLowerCase().trim(),
      plan,
      amount: amount || (plan === "Pro" ? 199900 : 999900),
      currency: currency || "INR",
      razorpayOrderId: razorpayOrderId || "",
      razorpayPaymentId: razorpayPaymentId || "",
      razorpaySignature: razorpaySignature || "",
      status: "Success"
    });

    const subscription = await Subscription.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        email: email.toLowerCase().trim(),
        plan,
        status: "Active",
        razorpayPaymentId: razorpayPaymentId || "",
        razorpayOrderId: razorpayOrderId || "",
        startsAt: new Date(),
        expiresAt: getExpiryDate(1),
        entitlements: PLAN_ENTITLEMENTS[plan]
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: `${plan} subscription activated`,
      subscription
    });
  } catch (error) {
    console.error("Billing activation error:", error.message);
    res.status(500).json({ message: "Failed to activate subscription" });
  }
});

router.post("/set-free", async (req, res) => {
  try {
    const email = getEmail(req);

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