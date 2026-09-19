const mongoose = require("mongoose");

const exporterOperatingProfileSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    companyId: { type: String, default: null, index: true },
    workspaceId: { type: String, default: null, index: true },

    company: {
      legalName: { type: String, default: "" },
      tradeName: { type: String, default: "" },
      businessType: { type: String, default: "" },
      gstin: { type: String, default: "" },
      pan: { type: String, default: "" },
      iec: { type: String, default: "" },
      rcmc: { type: String, default: "" },
      apedaRcmc: { type: String, default: "" }
    },

    products: [{
      name: { type: String, required: true },
      hsCode: { type: String, default: "" },
      category: { type: String, default: "" },
      origin: { type: String, default: "India" },
      certifications: { type: [String], default: [] }
    }],

    targetMarkets: [{
      country: { type: String, required: true },
      ports: { type: [String], default: [] },
      buyerType: { type: String, default: "" }
    }],

    operatingSetup: {
      bankReady: { type: Boolean, default: false },
      adCodeReady: { type: Boolean, default: false },
      logisticsReady: { type: Boolean, default: false },
      documentationReady: { type: Boolean, default: false },
      insuranceReady: { type: Boolean, default: false },
      complianceReady: { type: Boolean, default: false }
    },

    readiness: {
      score: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["not_started", "setup_required", "partially_ready", "ready_for_review", "execution_ready"],
        default: "not_started"
      },
      blockers: { type: [String], default: [] },
      nextActions: { type: [String], default: [] },
      evaluatedAt: { type: Date, default: null }
    },

    sourceSnapshot: {
      generatedAt: { type: Date, default: null },
      sourceCount: { type: Number, default: 0 },
      systemsCovered: { type: [String], default: [] }
    }
  },
  { timestamps: true }
);

exporterOperatingProfileSchema.index(
  { ownerEmail: 1, workspaceId: 1 },
  { unique: true }
);

module.exports = mongoose.model("ExporterOperatingProfile", exporterOperatingProfileSchema);
