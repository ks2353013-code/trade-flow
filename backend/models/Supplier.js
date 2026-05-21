const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    supplierName: {
      type: String,
      required: true,
    },

    product: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    score: {
      type: Number,
      default: 75,
    },

    status: {
      type: String,
      default: "Verified Lead",
    },

    source: {
      type: String,
      default: "Manual Entry",
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

module.exports = mongoose.model("Supplier", supplierSchema);