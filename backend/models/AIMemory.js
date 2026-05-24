const mongoose = require("mongoose");

const aiMemorySchema = new mongoose.Schema(
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
      required: false
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: false
    },

    type: {
      type: String,
      enum: [
        "Chat",
        "Supplier Insight",
        "CRM Insight",
        "Automation",
        "Risk",
        "Document",
        "General"
      ],
      default: "General"
    },

    prompt: {
      type: String,
      default: ""
    },

    response: {
      type: String,
      default: ""
    },

    source: {
      type: String,
      default: "TradeFlow AI"
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIMemory", aiMemorySchema);