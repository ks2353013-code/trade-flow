const mongoose = require("mongoose");

const governmentActionSchema = new mongoose.Schema(
  {
    actionKey: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["not_started", "ready", "in_progress", "submitted", "completed", "blocked", "manual_required"],
      default: "not_started"
    },
    mode: {
      type: String,
      enum: ["api", "official_data", "guided_portal", "manual"],
      required: true
    },
    officialUrl: { type: String, default: "" },
    externalReference: { type: String, default: "" },
    lastCheckedAt: { type: Date, default: null },
    lastUpdatedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const governmentConnectionSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    companyId: { type: String, default: null, index: true },
    workspaceId: { type: String, default: null, index: true },
    systemKey: {
      type: String,
      required: true,
      enum: ["dgft", "trade_connect", "icegate", "ecgc", "apeda", "msme", "export_promotion_councils"],
      index: true
    },
    displayName: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    connectionMode: {
      type: String,
      enum: ["api", "official_data", "guided_portal", "manual"],
      default: "guided_portal"
    },
    status: {
      type: String,
      enum: ["available", "configured", "action_required", "unavailable"],
      default: "available"
    },
    officialUrl: { type: String, default: "" },
    capabilityKeys: { type: [String], default: [] },
    actions: { type: [governmentActionSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

governmentConnectionSchema.index({ ownerEmail: 1, workspaceId: 1, systemKey: 1 }, { unique: true });

module.exports = mongoose.model("GovernmentConnection", governmentConnectionSchema);
