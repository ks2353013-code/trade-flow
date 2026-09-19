const mongoose = require("mongoose");

const integrationSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  providerKey: { type: String, required: true, trim: true },
  category: { type: String, enum: ["government", "trade_data", "logistics", "payment"], required: true },
  mode: { type: String, enum: ["api", "webhook", "official_portal", "manual"], required: true },
  status: { type: String, enum: ["disconnected", "ready", "active", "error"], default: "disconnected" },
  endpoint: { type: String, default: "" },
  credentialRef: { type: String, default: "", select: false },
  capabilities: { type: [String], default: [] },
  lastCheckedAt: { type: Date, default: null },
  lastError: { type: String, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

integrationSchema.index({ ownerEmail: 1, workspaceId: 1, providerKey: 1 }, { unique: true });

module.exports = mongoose.model("TradeIntegrationConnection", integrationSchema);
