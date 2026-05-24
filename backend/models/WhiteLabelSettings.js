const mongoose = require("mongoose");

const whiteLabelSettingsSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace"
    },

    companyName: {
      type: String,
      default: "TradeFlow"
    },

    companyLogo: {
      type: String,
      default: ""
    },

    primaryColor: {
      type: String,
      default: "#2563eb"
    },

    secondaryColor: {
      type: String,
      default: "#0f172a"
    },

    accentColor: {
      type: String,
      default: "#38bdf8"
    },

    portalTitle: {
      type: String,
      default: "TradeFlow Enterprise Portal"
    },

    customDomain: {
      type: String,
      default: ""
    },

    customCss: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "WhiteLabelSettings",
  whiteLabelSettingsSchema
);