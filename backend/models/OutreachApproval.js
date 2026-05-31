const mongoose = require("mongoose");

const outreachApprovalSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true
    },

    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TradeMission",
      default: null,
      index: true
    },

    crmLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CRMLead",
      default: null,
      index: true
    },

    leadName: {
      type: String,
      required: true,
      trim: true
    },

    leadType: {
      type: String,
      default: "Lead",
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

    country: {
      type: String,
      default: "",
      trim: true
    },

    channel: {
      type: String,
      enum: ["Email Draft", "WhatsApp Draft", "Call Script"],
      default: "Email Draft"
    },

    subject: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Approved", "Rejected", "Needs Edit"],
      default: "Pending Approval",
      index: true
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },

    sourceAgent: {
      type: String,
      default: "Outreach Agent",
      trim: true
    },

    approvalRequired: {
      type: Boolean,
      default: true
    },

    approvedBy: {
      type: String,
      default: "",
      lowercase: true,
      trim: true
    },

    approvedAt: {
      type: Date,
      default: null
    },

    rejectedBy: {
      type: String,
      default: "",
      lowercase: true,
      trim: true
    },

    rejectedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

outreachApprovalSchema.index({
  ownerEmail: 1,
  companyId: 1,
  workspaceId: 1,
  status: 1,
  createdAt: -1
});

module.exports = mongoose.model("OutreachApproval", outreachApprovalSchema);
