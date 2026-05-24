const mongoose = require("mongoose");

const billingHistorySchema =
  new mongoose.Schema(
    {
      email: {
        type: String,
        lowercase: true,
        trim: true,
        required: true
      },

      amount: {
        type: Number,
        default: 0
      },

      currency: {
        type: String,
        default: "INR"
      },

      status: {
        type: String,
        enum: [
          "Paid",
          "Failed",
          "Refunded"
        ],
        default: "Paid"
      },

      paymentId: {
        type: String,
        default: ""
      },

      orderId: {
        type: String,
        default: ""
      },

      provider: {
        type: String,
        default: "Razorpay"
      },

      metadata: {
        type: Object,
        default: {}
      }
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    "BillingHistory",
    billingHistorySchema
  );