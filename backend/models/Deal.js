const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    companyName: {
      type: String,
      required: true,
    },

    contactPerson: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    product: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      default: "",
    },

    value: {
      type: Number,
      default: 0,
    },

    stage: {
      type: String,
      enum: ["New Lead", "Contacted", "Negotiation", "Closed", "Lost"],
      default: "New Lead",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
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

module.exports = mongoose.model("Deal", dealSchema);