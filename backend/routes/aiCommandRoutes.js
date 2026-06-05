const express = require("express");
const mongoose = require("mongoose");

const AgentMissionPlan = require("../models/AgentMissionPlan");
const { createMissionPlan } = require("../services/missionPlanEngine");
const { writeAuditLog } = require("../utils/auditLogger");
const { requireBetaAccess } = require("../middleware/betaAccessMiddleware");

const router = express.Router();

function normalizeOwnerEmail(req) {
  return String(req.tenant?.ownerEmail || req.user?.email || "").toLowerCase().trim();
}

function requireContext(req, res) {
  if (!req.tenant?.workspaceId || !mongoose.isValidObjectId(req.tenant.workspaceId)) {
    res.status(400).json({
      success: false,
      message: "Active workspace is required for AI command planning."
    });
    return null;
  }

  return {
    ownerEmail: normalizeOwnerEmail(req),
    companyId: mongoose.isValidObjectId(req.tenant?.companyId) ? req.tenant.companyId : null,
    workspaceId: req.tenant.workspaceId,
    userId: mongoose.isValidObjectId(req.user?.id) ? req.user.id : null
  };
}

function addAuditTrail(action, actorEmail, status) {
  return {
    action,
    actorEmail,
    status,
    timestamp: new Date()
  };
}

router.post("/plan", requireBetaAccess, async (req, res) => {
  try {
    const context = requireContext(req, res);
    if (!context) return;

    const commandText = String(req.body?.commandText || req.body?.command || "").trim();

    if (!commandText) {
      return res.status(400).json({
        success: false,
        message: "Command text is required."
      });
    }

    const generated = createMissionPlan(commandText);
    const actorEmail = String(req.user?.email || context.ownerEmail).toLowerCase().trim();

    const mission = await AgentMissionPlan.create({
      ...context,
      commandText,
      missionTitle: generated.missionTitle,
      objective: generated.objective,
      plan: generated.plan,
      status: "Draft",
      auditTrail: [
        addAuditTrail("AI_COMMAND_SUBMITTED", actorEmail, "Draft"),
        addAuditTrail("AI_PLAN_GENERATED", actorEmail, "Draft"),
        ...generated.plan.steps.map((step) => (
          addAuditTrail("AGENT_STEP_CREATED", actorEmail, step.status)
        ))
      ]
    });

    await writeAuditLog(req, {
      module: "AI Command Center",
      action: "AI_COMMAND_SUBMITTED",
      entityType: "AgentMissionPlan",
      entityId: String(mission._id),
      severity: "Medium",
      metadata: {
        commandText,
        agentsRequired: generated.plan.agentsRequired,
        riskLevel: generated.plan.riskLevel
      }
    });

    await writeAuditLog(req, {
      module: "AI Command Center",
      action: "AI_PLAN_GENERATED",
      entityType: "AgentMissionPlan",
      entityId: String(mission._id),
      severity: "Medium",
      metadata: {
        missionTitle: mission.missionTitle,
        requiredApprovals: generated.plan.requiredApprovals
      }
    });

    res.status(201).json({
      success: true,
      mission,
      plan: mission.plan,
      agents: generated.agents,
      safety: {
        autonomousExternalActions: false,
        emailSending: false,
        whatsappSending: false,
        calls: false,
        payments: false,
        humanApprovalRequired: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate AI mission plan",
      error: error.message
    });
  }
});

router.get("/missions", requireBetaAccess, async (req, res) => {
  try {
    const context = requireContext(req, res);
    if (!context) return;

    const missions = await AgentMissionPlan.find({
      ownerEmail: context.ownerEmail,
      companyId: context.companyId,
      workspaceId: context.workspaceId
    }).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      missions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch AI command missions",
      error: error.message
    });
  }
});

router.post("/missions/:id/approval", requireBetaAccess, async (req, res) => {
  try {
    const context = requireContext(req, res);
    if (!context) return;

    const mission = await AgentMissionPlan.findOne({
      _id: req.params.id,
      ownerEmail: context.ownerEmail,
      companyId: context.companyId,
      workspaceId: context.workspaceId
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: "Mission plan not found"
      });
    }

    const actorEmail = String(req.user?.email || context.ownerEmail).toLowerCase().trim();

    mission.status = "Approval Required";
    mission.auditTrail.push(
      addAuditTrail("HUMAN_APPROVAL_REQUIRED", actorEmail, "Approval Required")
    );

    await mission.save();

    await writeAuditLog(req, {
      module: "AI Command Center",
      action: "HUMAN_APPROVAL_REQUIRED",
      entityType: "AgentMissionPlan",
      entityId: String(mission._id),
      severity: "High",
      metadata: {
        requiredApprovals: mission.plan?.requiredApprovals || []
      }
    });

    res.json({
      success: true,
      mission,
      message: "Mission plan sent for human approval. No external actions were executed."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send mission plan for approval",
      error: error.message
    });
  }
});

module.exports = router;
