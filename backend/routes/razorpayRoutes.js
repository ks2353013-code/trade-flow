const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

const PLAN_CONFIG = {
  Starter: {
    price: 1999,
    amount: 199900,
    approvalRequired: false
  },

  "Pro Exporter": {
    price: 8999,
    amount: 899900,
    approvalRequired: false
  },

  "Enterprise AI OS": {
    price: 49999,
    amount: 4999900,
    approvalRequired: true
  }
};

function getEmail(req) {
  return (
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.email ||
    req.query?.email ||
    ""
  )
    .toLowerCase()
    .trim();
}

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

router.post("/create-order", async (req, res) => {
  try {
    const email = getEmail(req);
    const { plan } = req.body;

    if (!email || !PLAN_CONFIG[plan]) {
      return res.status(400).json({
        success: false,
        message: "Valid email and plan are required"
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(400).json({
        success: false,
        message: "Razorpay keys missing in .env"
      });
    }

    const razorpay = getRazorpay();
    const config = PLAN_CONFIG[plan];

    const order = await razorpay.orders.create({
      amount: config.amount,
      currency: "INR",
      receipt: `tradeflow_${Date.now()}`,
      notes: {
        email,
        plan
      }
    });

    await writeAuditLog(req, {
      module: "Subscription",
      action: "Created Razorpay order",
      entityType: "PaymentOrder",
      entityId: order.id,
      severity: "Medium",
      metadata: {
        email,
        plan,
        amount: config.amount
      }
    });

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error.message
    });
  }
});

router.post("/verify-payment", async (req, res) => {
  try {
    const email = getEmail(req);

    const {
      plan,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!email || !PLAN_CONFIG[plan]) {
      return res.status(400).json({
        success: false,
        message: "Valid email and plan are required"
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await writeAuditLog(req, {
        module: "Subscription",
        action: "Payment verification failed",
        entityType: "Payment",
        entityId: razorpay_payment_id || "",
        severity: "High",
        metadata: {
          email,
          plan,
          razorpay_order_id
        }
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    const config = PLAN_CONFIG[plan];

    const entitlements =
      plan === "Starter"
        ? {
            aiLimit: 20,
            supplierLimit: 200,
            dealLimit: 50,
            workspaceLimit: 1,
            employeeLimit: 3
          }
        : plan === "Pro Exporter"
        ? {
            aiLimit: 1000,
            supplierLimit: 2000,
            dealLimit: 1000,
            workspaceLimit: 5,
            employeeLimit: 25
          }
        : {
            aiLimit: 10000,
            supplierLimit: 10000,
            dealLimit: 5000,
            workspaceLimit: 100,
            employeeLimit: 200
          };

    const subscription = await Subscription.create({
      email,
      plan,
      status: "Active",
      price: config.price,
      approvalStatus: config.approvalRequired ? "Pending" : "Not Required",
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      entitlements
    });

    if (!config.approvalRequired) {
      await User.findOneAndUpdate(
        { email },
        {
          subscriptionPlan: plan,
          subscriptionPrice: config.price,
          subscriptionStatus: "Active"
        },
        { new: true }
      );
    }

    await writeAuditLog(req, {
      module: "Subscription",
      action: config.approvalRequired
        ? "Enterprise payment received pending approval"
        : "Payment verified and subscription upgraded",
      entityType: "Subscription",
      entityId: String(subscription._id),
      severity: config.approvalRequired ? "High" : "Medium",
      metadata: {
        email,
        plan,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      }
    });

    res.json({
      success: true,
      message: config.approvalRequired
        ? "Payment successful. Enterprise activation is pending Master Admin approval."
        : "Payment successful. Subscription upgraded.",
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message
    });
  }
});

module.exports = router;