const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");

const router = express.Router();

const PLAN_PRICES = {
  "Pro Exporter": 899900,
  "Enterprise AI OS": 4999900
};

const PLAN_ENTITLEMENTS = {
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

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

function getExpiryDate(months = 1) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

function normalizeEmail(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizePlan(plan) {
  if (plan === "Pro") return "Pro Exporter";
  if (plan === "Enterprise") return "Enterprise AI OS";
  return plan;
}

router.post("/create-order", async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    const plan = normalizePlan(req.body.plan);

    if (!email || !plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(500).json({
        message: "Razorpay keys missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables."
      });
    }

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan],
      currency: "INR",
      receipt: `tradeflow_${plan}_${Date.now()}`,
      notes: {
        plan,
        email,
        product: "TradeFlow AI OS"
      }
    });

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan
    });
  } catch (error) {
    console.error("Razorpay order error:", error.message);
    res.status(500).json({ message: "Payment order creation failed" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency
    } = req.body;
    const plan = normalizePlan(req.body.plan);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay verification data" });
    }

    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: "Razorpay secret key missing" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const userEmail = normalizeEmail(req.user?.email);

    if (!userEmail) {
      return res.status(401).json({ message: "Authenticated user email missing" });
    }
    const approvalRequired = plan === "Enterprise AI OS";

    const payment = await Payment.create({
      email: userEmail,
      plan,
      amount: amount || PLAN_PRICES[plan],
      currency: currency || "INR",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: "Success"
    });

    const subscription = await Subscription.findOneAndUpdate(
      { email: userEmail },
      {
        email: userEmail,
        plan,
        status: approvalRequired ? "Pending Approval" : "Active",
        approvalStatus: approvalRequired ? "Pending" : "Not Required",
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        startsAt: new Date(),
        expiresAt: getExpiryDate(1),
        entitlements: PLAN_ENTITLEMENTS[plan]
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: approvalRequired
        ? "Payment verified. Enterprise activation is pending Master Admin approval."
        : "Payment verified and subscription activated",
      plan,
      paymentId: razorpay_payment_id,
      payment,
      subscription
    });
  } catch (error) {
    console.error("Payment verification error:", error.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

module.exports = router;
