const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    plan: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
      default: "Free"
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Cancelled", "Trial"],
      default: "Active"
    },
    razorpayPaymentId: {
      type: String,
      default: ""
    },
    razorpayOrderId: {
      type: String,
      default: ""
    },
    startsAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    entitlements: {
      aiLimit: { type: Number, default: 20 },
      supplierLimit: { type: Number, default: 25 },
      dealLimit: { type: Number, default: 20 },
      workspaceLimit: { type: Number, default: 1 },
      employeeLimit: { type: Number, default: 1 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);