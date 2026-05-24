const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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
      enum: ["Pro", "Enterprise"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    razorpayOrderId: {
      type: String,
      required: true
    },
    razorpayPaymentId: {
      type: String,
      required: true
    },
    razorpaySignature: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["Success", "Failed", "Refunded"],
      default: "Success"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);