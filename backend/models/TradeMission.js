const mongoose = require("mongoose");

const tradeMissionSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    companyId: { type: String, default: null },
    workspaceId: { type: String, default: null },
    missionText: { type: String, required: true },
    userResponse: { type: String, default: "" },
    direction: { type: String, enum: ["Export", "Import"], default: "Export" },
    product: { type: String, default: "General Product" },
    market: { type: String, default: "Global Market" },
    status: {
      type: String,
      enum: ["Draft", "Running", "Completed", "Needs Approval", "Failed"],
      default: "Draft"
    },
    agents: { type: Array, default: [] },
    agentReports: {
      research: { type: mongoose.Schema.Types.Mixed, default: null },
      buyerDiscovery: { type: mongoose.Schema.Types.Mixed, default: null },
      supplierDiscovery: { type: mongoose.Schema.Types.Mixed, default: null },
      crm: { type: mongoose.Schema.Types.Mixed, default: null },
      compliance: { type: mongoose.Schema.Types.Mixed, default: null },
      revenue: { type: mongoose.Schema.Types.Mixed, default: null },
      outreach: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    opportunities: { type: Array, default: [] },
    sourceEvidence: { type: mongoose.Schema.Types.Mixed, default: { market: [], counterparties: [], compliance: [] } },
    compliancePlan: { type: mongoose.Schema.Types.Mixed, default: null },
    readiness: {
      score: { type: Number, default: 0 },
      status: { type: String, default: "setup_required" },
      blockers: { type: Array, default: [] },
      nextActions: { type: Array, default: [] }
    },
    risks: { type: Array, default: [] },
    actions: { type: Array, default: [] },
    documents: { type: Array, default: [] },
    approvalsRequired: { type: Array, default: [] },
    revenueEstimate: { type: Number, default: null },
    opportunityScore: { type: Number, default: null },
    timeline: { type: Array, default: [] }
  },
  { timestamps: true }
);

tradeMissionSchema.index({ ownerEmail: 1, workspaceId: 1, updatedAt: -1 });

module.exports = mongoose.model("TradeMission", tradeMissionSchema);
