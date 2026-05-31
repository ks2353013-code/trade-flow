const mongoose = require("mongoose");

const outreachSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },

    contactName: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    product: {
      type: String,
      default: "",
    },

    message: {
      type: String,
      required: true,
    },

    channel: {
      type: String,
      default: "WhatsApp",
    },

    status: {
      type: String,
      enum: ["Draft", "Opened", "Follow-up Needed", "Converted", "Closed"],
      default: "Draft",
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Outreach", outreachSchema);
