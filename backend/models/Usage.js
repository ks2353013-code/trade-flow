const mongoose = require("mongoose");

const usageSchema = new mongoose.Schema(
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

    type: {
      type: String,
      default: "general"
    },

    action: {
      type: String,
      default: ""
    },

    event: {
      type: String,
      default: ""
    },

    usageCount: {
      type: Number,
      default: 1
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
  "Usage",
  usageSchema
);