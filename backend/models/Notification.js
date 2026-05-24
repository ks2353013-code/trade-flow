const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "unknown@tradeflow.local"
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

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: [
        "System",
        "AI",
        "Billing",
        "Security",
        "Workspace",
        "Employee",
        "CRM",
        "Supplier",
        "Task"
      ],
      default: "System"
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },

    read: {
      type: Boolean,
      default: false
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);