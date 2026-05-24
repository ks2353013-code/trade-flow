const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const PLAN_PRICES = {
  Pro: 199900,
  Enterprise: 999900
};

router.post("/create-order", async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan],
      currency: "INR",
      receipt: `tradeflow_${plan}_${Date.now()}`,
      notes: {
        plan,
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
      plan
    } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      plan,
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error("Payment verification error:", error.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

module.exports = router;