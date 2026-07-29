"use strict";

const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true, immutable: true, index: true },
  status: { type: String, required: true, enum: ["Pending", "Running", "Passed", "Failed", "CleanupFailed"] },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  artifact: { type: mongoose.Schema.Types.Mixed, default: null },
  privateCleanupScope: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    select: false
  }
}, { timestamps: true, strict: true, collection: "staging_acceptance_evidence" });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.StagingAcceptanceEvidence || mongoose.model("StagingAcceptanceEvidence", schema);
