const express = require("express");
const AuditLog = require("../models/AuditLog");

const {
  requirePlan
} = require("../middleware/subscriptionMiddleware");

const router = express.Router();

function getOwnerEmail(req) {
  return (
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    req.query?.ownerEmail ||
    "unknown@tradeflow.local"
  )
    .toString()
    .toLowerCase()
    .trim();
}

function getTenant(req) {
  return {
    ownerEmail: getOwnerEmail(req),
    companyId:
      req.headers["x-company-id"] ||
      req.body?.companyId ||
      req.query?.companyId ||
      undefined,
    workspaceId:
      req.headers["x-workspace-id"] ||
      req.body?.workspaceId ||
      req.query?.workspaceId ||
      undefined
  };
}

router.get("/", requirePlan("Enterprise"), async (req, res) => {
  try {
    const tenant = getTenant(req);

    const filter = {
      ownerEmail: tenant.ownerEmail
    };

    if (tenant.companyId) filter.companyId = tenant.companyId;
    if (tenant.workspaceId) filter.workspaceId = tenant.workspaceId;
    if (req.query.module) filter.module = req.query.module;
    if (req.query.severity) filter.severity = req.query.severity;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(logs);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch audit logs"
    });
  }
});

router.post("/", requirePlan("Enterprise"), async (req, res) => {
  try {
    const tenant = getTenant(req);

    const { action, module, severity, message, metadata } = req.body;

    if (!action || !message) {
      return res.status(400).json({
        message: "Action and message are required"
      });
    }

    const log = await AuditLog.create({
      ownerEmail: tenant.ownerEmail,
      companyId: tenant.companyId,
      workspaceId: tenant.workspaceId,
      actorEmail: tenant.ownerEmail,
      action,
      module: module || "General",
      severity: severity || "Info",
      message,
      metadata: metadata || {},
      ipAddress:
        req.headers["x-forwarded-for"] ||
        req.socket?.remoteAddress ||
        "",
      userAgent: req.headers["user-agent"] || ""
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({
      message: "Failed to save audit log"
    });
  }
});

router.delete("/:id", requirePlan("Enterprise"), async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const log = await AuditLog.findOneAndDelete({
      _id: req.params.id,
      ownerEmail
    });

    if (!log) {
      return res.status(404).json({
        message: "Audit log not found"
      });
    }

    res.json({
      message: "Audit log deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete audit log"
    });
  }
});

router.delete("/", requirePlan("Enterprise"), async (req, res) => {
  try {
    const tenant = getTenant(req);

    const filter = {
      ownerEmail: tenant.ownerEmail
    };

    if (tenant.companyId) filter.companyId = tenant.companyId;
    if (tenant.workspaceId) filter.workspaceId = tenant.workspaceId;

    await AuditLog.deleteMany(filter);

    res.json({
      message: "Audit logs cleared"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to clear audit logs"
    });
  }
});

module.exports = router;