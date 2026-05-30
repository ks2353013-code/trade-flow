const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const Subscription = require("../models/Subscription");
const User = require("../models/User");

const router = express.Router();

const MASTER_ADMIN_EMAILS = [
  "ks2353013@gmail.com",
  "contact@tradeflowai.in"
];

const PLAN_CONFIG = {
  Starter: {
    price: 1999,
    amount: 199900,
    approvalRequired: false,
    entitlements: {
      aiLimit: 20,
      supplierLimit: 200,
      dealLimit: 50,
      workspaceLimit: 1,
      employeeLimit: 3
    }
  },

  "Pro Exporter": {
    price: 8999,
    amount: 899900,
    approvalRequired: false,
    entitlements: {
      aiLimit: 1000,
      supplierLimit: 2000,
      dealLimit: 1000,
      workspaceLimit: 5,
      employeeLimit: 25
    }
  },

  "Enterprise AI OS": {
    price: 49999,
    amount: 4999900,
    approvalRequired: true,
    entitlements: {
      aiLimit: 10000,
      supplierLimit: 10000,
      dealLimit: 5000,
      workspaceLimit: 100,
      employeeLimit: 200
    }
  }
};

function getEmail(req) {
  return String(req.user?.email || "").toLowerCase().trim();
}

function isMaster(req) {
  return MASTER_ADMIN_EMAILS.includes(getEmail(req));
}

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

async function createDefaultSubscription(email) {
  return await Subscription.create({
    email,
    plan: "Starter",
    status: "Active",
    price: PLAN_CONFIG.Starter.price,
    approvalStatus: "Not Required",
    entitlements: PLAN_CONFIG.Starter.entitlements
  });
}

router.get("/me", async (req, res) => {
  try {
    const email = getEmail(req);

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    let subscription = await Subscription.findOne({ email }).sort({
      createdAt: -1
    });

    if (!subscription) {
      subscription = await createDefaultSubscription(email);
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription",
      error: error.message
    });
  }
});

router.post("/request-upgrade", async (req, res) => {
  try {
    const email = getEmail(req);
    const { plan } = req.body;

    if (!email || !PLAN_CONFIG[plan]) {
      return res.status(400).json({
        success: false,
        message: "Valid authenticated user and plan are required"
      });
    }

    const config = PLAN_CONFIG[plan];

    const subscription = await Subscription.create({
      email,
      plan,
      status: config.approvalRequired ? "Pending Approval" : "Payment Required",
      price: config.price,
      approvalStatus: config.approvalRequired ? "Pending" : "Payment Required",
      entitlements: config.entitlements
    });

    res.json({
      success: true,
      message: config.approvalRequired
        ? "Enterprise upgrade request received. Payment and Master Admin approval are required before activation."
        : "Upgrade request created. Payment verification is required before activation.",
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Upgrade request failed",
      error: error.message
    });
  }
});

router.post("/create-order", async (req, res) => {
  try {
    const email = getEmail(req);
    const { plan } = req.body;

    if (!email || !PLAN_CONFIG[plan]) {
      return res.status(400).json({
        success: false,
        message: "Valid authenticated user and plan are required"
      });
    }

    const razorpay = getRazorpay();

    if (!razorpay) {
      return res.status(400).json({
        success: false,
        message: "Razorpay keys are missing"
      });
    }

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

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
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
        message: "Valid authenticated user and plan are required"
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment details are required"
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    const config = PLAN_CONFIG[plan];

    const subscription = await Subscription.create({
      email,
      plan,
      status: config.approvalRequired ? "Pending Approval" : "Active",
      price: config.price,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      approvalStatus: config.approvalRequired ? "Pending" : "Not Required",
      entitlements: config.entitlements
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

    res.json({
      success: true,
      message: config.approvalRequired
        ? "Payment verified. Enterprise activation is pending Master Admin approval."
        : "Payment verified. Plan upgraded successfully.",
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

router.get("/pending-enterprise", async (req, res) => {
  try {
    if (!isMaster(req)) {
      return res.status(403).json({
        success: false,
        message: "Master Admin access required"
      });
    }

    const pending = await Subscription.find({
      plan: "Enterprise AI OS",
      approvalStatus: "Pending"
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      pending
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending enterprise requests",
      error: error.message
    });
  }
});

router.post("/approve-enterprise", async (req, res) => {
  try {
    if (!isMaster(req)) {
      return res.status(403).json({
        success: false,
        message: "Master Admin access required"
      });
    }

    const { subscriptionId } = req.body;

    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        approvalStatus: "Approved",
        status: "Active"
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    await User.findOneAndUpdate(
      { email: subscription.email },
      {
        subscriptionPlan: "Enterprise AI OS",
        subscriptionPrice: PLAN_CONFIG["Enterprise AI OS"].price,
        subscriptionStatus: "Active"
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Enterprise subscription approved",
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Enterprise approval failed",
      error: error.message
    });
  }
});

router.post("/reject-enterprise", async (req, res) => {
  try {
    if (!isMaster(req)) {
      return res.status(403).json({
        success: false,
        message: "Master Admin access required"
      });
    }

    const { subscriptionId } = req.body;

    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        approvalStatus: "Rejected",
        status: "Cancelled"
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    res.json({
      success: true,
      message: "Enterprise subscription rejected",
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Enterprise rejection failed",
      error: error.message
    });
  }
});

module.exports = router;