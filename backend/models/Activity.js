const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
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