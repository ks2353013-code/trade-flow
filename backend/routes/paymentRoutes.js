const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");

const router = express.Router();

const PLAN_PRICES = {
  Pro: 199900,
  Enterprise: 999900
};

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
  return (value || "unknown@tradeflow.local").toString().toLowerCase().trim();
}

router.post("/create-order", async (req, res) => {
  try {
    const { plan, email } = req.body;

    if (!plan || !PLAN_PRICES[plan]) {
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
        email: normalizeEmail(email),
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
      plan,
      email,
      amount,
      currency
    } = req.body;

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

    const userEmail = normalizeEmail(email);

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
        status: "Active",
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
      message: "Payment verified and subscription activated",
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
