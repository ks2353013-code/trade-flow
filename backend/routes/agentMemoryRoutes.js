const express = require("express");
const mongoose = require("mongoose");

const AgentMemory = require("../models/AgentMemory");
const { writeAuditLog } = require("../utils/auditLogger");
const { requireBetaAccess } = require("../middleware/betaAccessMiddleware");

const router = express.Router();

const SECRET_WORDS = [
  "password",
  "token",
  "secret",
  "authorization",
  "bearer ",
  "reset token"
];

function getContext(req, res) {
  if (!req.tenant?.workspaceId || !mongoose.isValidObjectId(req.tenant.workspaceId)) {
    res.status(400).json({
      success: false,
      message: "Active workspace is required for agent memory."
    });
    return null;
  }

  return {
    ownerEmail: String(req.tenant.ownerEmail || req.user?.email || "").toLowerCase().trim(),
    companyId: mongoose.isValidObjectId(req.tenant?.companyId) ? req.tenant.companyId : null,
    workspaceId: req.tenant.workspaceId,
    userId: mongoose.isValidObjectId(req.user?.id) ? req.user.id : null
  };
}

function rejectSensitiveContent(content = "") {
  const lower = String(content || "").toLowerCase();
  return SECRET_WORDS.some((word) => lower.includes(word));
}

router.get("/", requireBetaAccess, async (req, res) => {
  try {
    const context = getContext(req, res);
    if (!context) return;

    const filter = {
      ownerEmail: context.ownerEmail,
      companyId: context.companyId,
      workspaceId: context.workspaceId
    };

    if (req.query.agentId) filter.agentId = String(req.query.agentId);
    if (req.query.memoryType) filter.memoryType = String(req.query.memoryType);

    const memories = await AgentMemory.find(filter).sort({ createdAt: -1 }).limit(100);

    res.json({
      success: true,
      memories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent memory",
      error: error.message
    });
  }
});

router.post("/", requireBetaAccess, async (req, res) => {
  try {
    const context = getContext(req, res);
    if (!context) return;

    const content = String(req.body?.content || "").trim();

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Memory content is required."
      });
    }

    if (rejectSensitiveContent(content)) {
      return res.status(400).json({
        success: false,
        message: "Agent memory cannot store passwords, tokens or sensitive secrets."
      });
    }

    const memory = await AgentMemory.create({
      ...context,
      missionId: mongoose.isValidObjectId(req.body?.missionId) ? req.body.missionId : null,
      agentId: String(req.body?.agentId || "research").trim(),
      memoryType: req.body?.memoryType || "general",
      content,
      source: String(req.body?.source || "AI Command Center").slice(0, 160),
      confidence: Math.max(0, Math.min(100, Number(req.body?.confidence || 70)))
    });

    await writeAuditLog(req, {
      module: "Agent Memory",
      action: "AGENT_MEMORY_CREATED",
      entityType: "AgentMemory",
      entityId: String(memory._id),
      severity: "Medium",
      metadata: {
        agentId: memory.agentId,
        memoryType: memory.memoryType,
        confidence: memory.confidence
      }
    });

    res.status(201).json({
      success: true,
      memory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save agent memory",
      error: error.message
    });
  }
});

module.exports = router;
