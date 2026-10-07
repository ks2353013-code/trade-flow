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

    freshnessScore: {
      type: Number,
      default: 0
    },

    freshnessStatus: {
      type: String,
      enum: ["Unknown", "Fresh", "Aging", "Stale", "Very Stale"],
      default: "Unknown"
    },

    freshnessAgeDays: {
      type: Number,
      default: null
    },

    tradeIntentScore: {
      type: Number,
      default: 0,
      index: true
    },

    tradeIntentStatus: {
      type: String,
      enum: ["Low Intent", "Watch", "Promising", "High Intent"],
      default: "Watch"
    },

    verificationEvidence: {
      type: [{
        type: { type: String, default: "" },
        label: { type: String, default: "" },
        value: { type: String, default: "" }
      }],
      default: []
    },

    verificationWarnings: {
      type: [String],
      default: []
    },

    intelligenceEvidence: {
      type: [String],
      default: []
    },

    intelligenceUpdatedAt: {
      type: Date,
      default: null
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

    assignedToEmail: {
      type: String,
      default: "",
      lowercase: true,
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
