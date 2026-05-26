const express = require("express");
const crypto = require("crypto");

const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

function verifyWebhookSignature(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) return false;

  const signature = req.headers["x-razorpay-signature"];

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  return expectedSignature === signature;
}

router.post("/webhook", async (req, res) => {
  try {
    const valid = verifyWebhookSignature(req);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay webhook signature"
      });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured") {
      const payment = payload.payment.entity;

      const email = payment.notes?.email;
      const plan = payment.notes?.plan;

      if (!email || !plan) {
        return res.status(400).json({
          success: false,
          message: "Missing email or plan in payment notes"
        });
      }

      let price = 1999;
      let approvalStatus = "Not Required";

      if (plan === "Pro Exporter") {
        price = 8999;
      }

      if (plan === "Enterprise AI OS") {
        price = 49999;
        approvalStatus = "Pending";
      }

      const subscription = await Subscription.create({
        email: email.toLowerCase().trim(),
        plan,
        status: "Active",
        price,
        approvalStatus,
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.order_id
      });

      if (approvalStatus === "Not Required") {
        await User.findOneAndUpdate(
          { email: email.toLowerCase().trim() },
          {
            subscriptionPlan: plan,
            subscriptionPrice: price,
            subscriptionStatus: "Active"
          },
          { new: true }
        );
      }

      await writeAuditLog(
        {
          headers: {
            "x-user-email": email
          },
          body: {
            email
          },
          tenant: {
            ownerEmail: email
          }
        },
        {
          module: "Subscription",
          action:
            approvalStatus === "Pending"
              ? "Webhook payment captured pending enterprise approval"
              : "Webhook payment captured and subscription activated",
          entityType: "Subscription",
          entityId: String(subscription._id),
          severity: approvalStatus === "Pending" ? "High" : "Medium",
          metadata: {
            paymentId: payment.id,
            orderId: payment.order_id,
            plan
          }
        }
      );
    }

    res.json({
      success: true,
      message: "Webhook processed"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: error.message
    });
  }
});

module.exports = router;