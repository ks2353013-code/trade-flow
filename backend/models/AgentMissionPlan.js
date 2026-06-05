const mongoose = require("mongoose");

const agentStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true },
    agentId: { type: String, required: true },
    agentName: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "approval_required"],
      default: "pending"
    },
    requiresHumanApproval: { type: Boolean, default: false },
    forbiddenExternalActions: { type: [String], default: [] }
  },
  { _id: false }
);

const agentMissionPlanSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    commandText: {
      type: String,
      required: true,
      trim: true
    },
    plan: {
      goal: { type: String, default: "" },
      product: { type: String, default: "" },
      targetCountry: { type: String, default: "" },
      agentsRequired: { type: [String], default: [] },
      steps: { type: [agentStepSchema], default: [] },
      requiredApprovals: { type: [String], default: [] },
      estimatedActions: { type: [String], default: [] },
      riskLevel: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
      }
    },
    missionTitle: { type: String, default: "" },
    objective: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Approval Required", "Approved", "In Progress", "Completed", "Rejected"],
      default: "Draft"
    },
    auditTrail: {
      type: [
        {
          action: { type: String, required: true },
          actorEmail: { type: String, default: "" },
          status: { type: String, default: "" },
          timestamp: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

agentMissionPlanSchema.index({ ownerEmail: 1, workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model("AgentMissionPlan", agentMissionPlanSchema);
