const mongoose = require("mongoose");

const tradeOpportunitySchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    missionId: { type: mongoose.Schema.Types.ObjectId, ref: "TradeMission", default: null, index: true },
    crmLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "CRMLead", default: null, index: true },
    type: { type: String, enum: ["Buyer", "Supplier"], required: true },
    companyName: { type: String, required: true, trim: true },
    country: { type: String, default: "" },
    website: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    stage: { type: String, default: "discovered" },
    status: { type: String, enum: ["active", "won", "lost", "paused"], default: "active" },
    fitScore: { type: Number, default: 0 },
    verificationScore: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    freshness: { type: String, enum: ["fresh", "aging", "stale", "unknown"], default: "unknown" },
    nextBestAction: { type: String, default: "" },
    nextBestActionReason: { type: String, default: "" },
    evidence: {
      type: [{ source: String, url: String, observedAt: Date, label: String, confidence: Number }],
      default: []
    },
    activitySummary: { type: String, default: "" },
    riskSummary: { type: String, default: "" },
    revenueEstimate: { type: Number, default: null },
    lastContactedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

tradeOpportunitySchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
tradeOpportunitySchema.index({ workspaceId: 1, type: 1, stage: 1, fitScore: -1 });

module.exports = mongoose.model("TradeOpportunity", tradeOpportunitySchema);
