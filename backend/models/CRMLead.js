const mongoose = require("mongoose");

const crmLeadSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true
    },

    leadType: {
      type: String,
      required: true,
      trim: true
    },

    sourceType: {
      type: String,
      default: "",
      trim: true
    },

    country: {
      type: String,
      default: "",
      trim: true
    },

    website: {
      type: String,
      default: "",
      lowercase: true,
      trim: true
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      default: "",
      trim: true
    },

    confidenceScore: {
      type: Number,
      default: 0
    },

    verificationScore: {
      type: Number,
      required: true,
      default: 0
    },

    verificationStatus: {
      type: String,
      default: "Unverified",
      trim: true
    },

    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TradeMission",
      required: true,
      index: true
    },

    sourceAgent: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      default: "Open",
      trim: true
    },

    stage: {
      type: String,
      default: "New Lead",
      trim: true
    },

    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true
    }
  },
  {
    timestamps: {
      updatedAt: false
    }
  }
);

crmLeadSchema.index({
  ownerEmail: 1,
  companyId: 1,
  workspaceId: 1,
  companyName: 1,
  website: 1,
  email: 1
});

module.exports = mongoose.model("CRMLead", crmLeadSchema);
