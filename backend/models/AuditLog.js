const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
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

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    },

    module: {
      type: String,
      default: "General"
    },

    action: {
      type: String,
      required: true
    },

    entityType: {
      type: String,
      default: ""
    },

    entityId: {
      type: String,
      default: ""
    },

    severity: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
        "Critical"
      ],
      default: "Low"
    },

    ipAddress: {
      type: String,
      default: ""
    },

    userAgent: {
      type: String,
      default: ""
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "AuditLog",
  auditLogSchema
);