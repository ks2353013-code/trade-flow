const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    type: {
      type: String,
      default: "General"
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    source: {
      type: String,
      default: "TradeFlow"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
