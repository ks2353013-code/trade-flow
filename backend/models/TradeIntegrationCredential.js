const mongoose = require("mongoose");

const credentialSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  providerKey: { type: String, required: true, trim: true },
  encryptedPayload: { type: String, required: true, select: false },
  keyVersion: { type: Number, default: 1 },
  lastRotatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

credentialSchema.index({ ownerEmail: 1, workspaceId: 1, providerKey: 1 }, { unique: true });

module.exports = mongoose.model("TradeIntegrationCredential", credentialSchema);
