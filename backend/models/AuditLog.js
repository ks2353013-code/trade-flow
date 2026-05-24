const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
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

    actorEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "unknown@tradeflow.local"
    },

    action: {
      type: String,
      required: true
    },

    module: {
      type: String,
      default: "General"
    },

    severity: {
      type: String,
      enum: ["Info", "Warning", "Critical"],
      default: "Info"
    },

    message: {
      type: String,
      required: true
    },

    metadata: {
      type: Object,
      default: {}
    },

    ipAddress: {
      type: String,
      default: ""
    },

    userAgent: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);