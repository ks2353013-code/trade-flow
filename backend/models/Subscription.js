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
      enum: [
        "Starter",
        "Pro Exporter",
        "Enterprise AI OS"
      ],
      default: "Starter"
    },

    status: {
      type: String,
      enum: [
        "Active",
        "Expired",
        "Cancelled",
        "Trial",
        "Past Due"
      ],
      default: "Active"
    },

    approvalStatus: {
      type: String,
      enum: [
        "Not Required",
        "Pending",
        "Approved",
        "Rejected"
      ],
      default: "Not Required"
    },

    price: {
      type: Number,
      default: 1999
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
      aiLimit: {
        type: Number,
        default: 20
      },

      supplierLimit: {
        type: Number,
        default: 200
      },

      dealLimit: {
        type: Number,
        default: 50
      },

      workspaceLimit: {
        type: Number,
        default: 1
      },

      employeeLimit: {
        type: Number,
        default: 3
      }
    }
  },
  { timestamps: true }
);

subscriptionSchema.pre("save", function (next) {

  if (this.plan === "Starter") {

    this.price = 1999;

    this.approvalStatus = "Not Required";

    this.entitlements = {
      aiLimit: 20,
      supplierLimit: 200,
      dealLimit: 50,
      workspaceLimit: 1,
      employeeLimit: 3
    };
  }

  if (this.plan === "Pro Exporter") {

    this.price = 8999;

    this.approvalStatus = "Not Required";

    this.entitlements = {
      aiLimit: 1000,
      supplierLimit: 2000,
      dealLimit: 1000,
      workspaceLimit: 5,
      employeeLimit: 25
    };
  }

  if (this.plan === "Enterprise AI OS") {

    this.price = 49999;

    if (
      this.approvalStatus !== "Approved"
    ) {
      this.approvalStatus = "Pending";
    }

    this.entitlements = {
      aiLimit: 10000,
      supplierLimit: 10000,
      dealLimit: 5000,
      workspaceLimit: 100,
      employeeLimit: 200
    };
  }

  next();
});

module.exports = mongoose.model(
  "Subscription",
  subscriptionSchema
);