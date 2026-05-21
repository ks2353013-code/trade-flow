const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    companyName: {
      type: String,
      required: true,
    },

    businessType: {
      type: String,
      enum: ["Exporter", "Importer", "Both", "Agency", "Manufacturer"],
      default: "Both",
    },

    country: {
      type: String,
      default: "",
    },

    gstNumber: {
      type: String,
      default: "",
    },

    iecCode: {
      type: String,
      default: "",
    },

    industry: {
      type: String,
      default: "",
    },

    defaultCurrency: {
      type: String,
      default: "USD",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Workspace", workspaceSchema);