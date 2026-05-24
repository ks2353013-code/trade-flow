const express = require("express");
const crypto = require("crypto");

const Subscription = require("../models/Subscription");
const BillingHistory = require("../models/BillingHistory");

const router = express.Router();

/* =========================
   RAZORPAY WEBHOOK
========================= */

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),

  async (req, res) => {

    try {

      const secret =
        process.env.RAZORPAY_WEBHOOK_SECRET;

      const signature =
        req.headers["x-razorpay-signature"];

      const expectedSignature =
        crypto
          .createHmac("sha256", secret)
          .update(req.body)
          .digest("hex");

      if (
        signature !== expectedSignature
      ) {

        console.error(
          "❌ Invalid Razorpay webhook signature"
        );

        return res.status(400).json({
          message:
            "Invalid webhook signature"
        });

      }

      const payload =
        JSON.parse(req.body.toString());

      const event =
        payload.event;

      const payment =
        payload.payload?.payment?.entity;

      const email =
        payment?.email ||
        "unknown@tradeflow.local";

      console.log(
        "✅ Razorpay Event:",
        event
      );

      /* =========================
         PAYMENT SUCCESS
      ========================= */

      if (
        event ===
        "payment.captured"
      ) {

        const amount =
          (payment.amount || 0) / 100;

        const plan =
          amount >= 9999
            ? "Enterprise"
            : "Pro";

        await Subscription.findOneAndUpdate(
          {
            email:
              email.toLowerCase()
          },
          {
            email:
              email.toLowerCase(),

            plan,

            status: "Active",

            razorpayPaymentId:
              payment.id,

            lastPaymentAt:
              new Date(),

            expiresAt:
              new Date(
                Date.now() +
                30 * 24 * 60 * 60 * 1000
              )
          },
          {
            upsert: true,
            new: true
          }
        );

        await BillingHistory.create({
          email:
            email.toLowerCase(),

          amount,

          currency:
            payment.currency || "INR",

          status: "Paid",

          paymentId:
            payment.id,

          orderId:
            payment.order_id,

          provider: "Razorpay",

          metadata: payload
        });

        console.log(
          `✅ Subscription activated for ${email}`
        );

      }

      /* =========================
         PAYMENT FAILED
      ========================= */

      if (
        event ===
        "payment.failed"
      ) {

        await BillingHistory.create({
          email:
            email.toLowerCase(),

          amount:
            (payment.amount || 0) / 100,

          currency:
            payment.currency || "INR",

          status: "Failed",

          paymentId:
            payment.id,

          orderId:
            payment.order_id,

          provider: "Razorpay",

          metadata: payload
        });

        console.log(
          `❌ Payment failed for ${email}`
        );

      }

      res.json({
        success: true
      });

    } catch (error) {

      console.error(
        "Webhook Error:",
        error.message
      );

      res.status(500).json({
        message:
          "Webhook processing failed"
      });

    }

  }
);

module.exports = router;