const mongoose = require("mongoose");

const tradeMissionSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    companyId: { type: String, default: null },
    workspaceId: { type: String, default: null },

    missionText: { type: String, required: true },
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
    risks: { type: Array, default: [] },
    actions: { type: Array, default: [] },
    documents: { type: Array, default: [] },
    approvalsRequired: { type: Array, default: [] },

    revenueEstimate: { type: Number, default: 0 },
    opportunityScore: { type: Number, default: 0 },

    timeline: { type: Array, default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TradeMission", tradeMissionSchema);
