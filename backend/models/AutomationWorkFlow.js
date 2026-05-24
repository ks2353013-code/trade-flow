const mongoose = require("mongoose");

const automationWorkflowSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace"
    },

    name: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    triggerType: {
      type: String,
      required: true
    },

    triggerCondition: {
      type: Object,
      default: {}
    },

    actionType: {
      type: String,
      required: true
    },

    actionConfig: {
      type: Object,
      default: {}
    },

    enabled: {
      type: Boolean,
      default: true
    },

    executionCount: {
      type: Number,
      default: 0
    },

    lastExecutedAt: {
      type: Date
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
  "AutomationWorkflow",
  automationWorkflowSchema
);