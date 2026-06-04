const mongoose = require("mongoose");

const clientErrorLogSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true
    },

    stack: {
      type: String,
      default: ""
    },

    route: {
      type: String,
      default: ""
    },

    page: {
      type: String,
      default: ""
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
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

    browserInfo: {
      type: Object,
      default: {}
    },

    userAgent: {
      type: String,
      default: ""
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ClientErrorLog", clientErrorLogSchema);
