const mongoose = require("mongoose");

const complianceSnapshotSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  missionId: { type: mongoose.Schema.Types.ObjectId, ref: "TradeMission", required: true, index: true },
  direction: { type: String, enum: ["Export", "Import"], required: true },
  product: { type: String, required: true },
  hsCode: { type: String, default: "" },
  origin: { type: String, default: "" },
  destination: { type: String, default: "" },
  transactionType: { type: String, default: "commercial" },
  status: { type: String, enum: ["preliminary", "verified", "blocked"], default: "preliminary" },
  requirements: [{
    key: { type: String, required: true },
    title: { type: String, required: true },
    owner: { type: String, enum: ["tradeflow", "customer", "government", "logistics", "bank"], default: "customer" },
    status: { type: String, enum: ["to_verify", "ready", "blocked", "completed"], default: "to_verify" },
    officialSource: { type: String, default: "" },
    reason: { type: String, default: "" }
  }],
  sourceEvidence: { type: [mongoose.Schema.Types.Mixed], default: [] },
  generatedAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date, default: null }
}, { timestamps: true });

complianceSnapshotSchema.index({ ownerEmail: 1, workspaceId: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model("TradeComplianceSnapshot", complianceSnapshotSchema);
