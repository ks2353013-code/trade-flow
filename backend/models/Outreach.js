const mongoose = require("mongoose");

const outreachSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
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