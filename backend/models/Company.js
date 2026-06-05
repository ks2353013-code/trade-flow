const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },

    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    companyName: {
      type: String,
      required: true,
      trim: true
    },

    businessType: {
      type: String,
      enum: [
        "Supplier",
        "Manufacturer",
        "Buyer",
        "Trading Company",
        "Buying House",
        "Exporter",
        "Importer",
        "Both",
        "Agency"
      ],
      default: "Trading Company"
    },

    businessTypeLocked: {
      type: Boolean,
      default: false
    },

    businessTypeLockedAt: {
      type: Date,
      default: null
    },

    country: {
      type: String,
      default: ""
    },

    gstNumber: {
      type: String,
      default: ""
    },

    iecCode: {
      type: String,
      default: ""
    },

    industry: {
      type: String,
      default: ""
    },

    defaultCurrency: {
      type: String,
      default: "USD"
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending", "Rejected"],
      default: "Active"
    },

    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending"
    },

    plan: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
      default: "Free"
    },

    settings: {
      aiEnabled: { type: Boolean, default: true },
      outreachEnabled: { type: Boolean, default: false },
      documentsEnabled: { type: Boolean, default: false },
      analyticsEnabled: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
