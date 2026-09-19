const express = require("express");
const { listConnections, createMissionGatewayPlan, updateAction } = require("../services/governmentTradeGateway");
const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

function ensureWorkspace(req, res) {
  if (!req.tenant?.workspaceId) {
    res.status(400).json({ success: false, message: "Active workspace is required for Government Trade Gateway." });
    return false;
  }
  return true;
}

router.get("/connections", async (req, res) => {
  try {
    if (!ensureWorkspace(req, res)) return;
    const connections = await listConnections(req);
    res.json({ success: true, connections });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load Government Trade Gateway", error: error.message });
  }
});

router.post("/mission-plan", async (req, res) => {
  try {
    if (!ensureWorkspace(req, res)) return;
    const plan = await createMissionGatewayPlan(req, {
      product: req.body?.product,
      country: req.body?.country,
      direction: req.body?.direction || "Export"
    });

    await writeAuditLog(req, {
      module: "Government Trade Gateway",
      action: "GOVERNMENT_MISSION_PLAN_CREATED",
      entityType: "GovernmentConnection",
      entityId: req.tenant.workspaceId,
      severity: "Medium",
      metadata: {
        product: req.body?.product || "",
        country: req.body?.country || "",
        direction: req.body?.direction || "Export",
        totalSystems: plan.summary.totalSystems,
        totalActions: plan.summary.totalActions
      }
    });

    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create government mission plan", error: error.message });
  }
});

router.post("/connections/:systemKey/actions/:actionKey/status", async (req, res) => {
  try {
    if (!ensureWorkspace(req, res)) return;
    const connection = await updateAction(req, req.params.systemKey, req.params.actionKey, {
      status: req.body?.status,
      externalReference: req.body?.externalReference,
      notes: req.body?.notes
    });

    await writeAuditLog(req, {
      module: "Government Trade Gateway",
      action: "GOVERNMENT_ACTION_STATUS_UPDATED",
      entityType: "GovernmentConnection",
      entityId: String(connection._id),
      severity: "Low",
      metadata: {
        systemKey: req.params.systemKey,
        actionKey: req.params.actionKey,
        status: req.body?.status || "in_progress"
      }
    });

    res.json({ success: true, connection });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update government action status", error: error.message });
  }
});

router.get("/status", async (req, res) => {
  try {
    if (!ensureWorkspace(req, res)) return;
    const connections = await listConnections(req);
    const actionRows = connections.flatMap((connection) => connection.actions || []);
    const completed = actionRows.filter((action) => action.status === "completed").length;
    const active = actionRows.filter((action) => ["ready", "in_progress", "submitted"].includes(action.status)).length;
    const blocked = actionRows.filter((action) => ["blocked", "manual_required"].includes(action.status)).length;

    res.json({
      success: true,
      status: {
        systems: connections.length,
        actions: actionRows.length,
        completed,
        active,
        blocked,
        readinessPercent: actionRows.length ? Math.round((completed / actionRows.length) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load gateway status", error: error.message });
  }
});

module.exports = router;
