const mongoose = require("mongoose");

const agentMemorySchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgentMissionPlan",
      default: null
    },
    agentId: {
      type: String,
      required: true,
      trim: true
    },
    memoryType: {
      type: String,
      enum: [
        "successful_buyer_search",
        "rejected_lead",
        "verified_supplier",
        "outreach_tone_preference",
        "country_product_preference",
        "past_mission_outcome",
        "general"
      ],
      default: "general"
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    source: {
      type: String,
      default: "AI Command Center"
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    }
  },
  { timestamps: true }
);

agentMemorySchema.index({ ownerEmail: 1, workspaceId: 1, agentId: 1, createdAt: -1 });

module.exports = mongoose.model("AgentMemory", agentMemorySchema);
