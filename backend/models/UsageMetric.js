const mongoose = require("mongoose");

const usageMetricSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      required: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: false
    },

    metricType: {
      type: String,
      required: true
    },

    count: {
      type: Number,
      default: 0
    },

    period: {
      type: String,
      default: "monthly"
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "UsageMetric",
  usageMetricSchema
);