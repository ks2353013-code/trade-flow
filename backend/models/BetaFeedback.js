const mongoose = require("mongoose");

const betaFeedbackSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    type: {
      type: String,
      enum: ["feedback", "issue", "feature_request", "support"],
      default: "feedback"
    },
    title: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      required: true
    },
    page: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["Open", "Reviewed", "Closed"],
      default: "Open"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    }
  },
  { timestamps: true }
);

betaFeedbackSchema.index({ ownerEmail: 1, workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model("BetaFeedback", betaFeedbackSchema);
