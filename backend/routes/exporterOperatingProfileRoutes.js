const express = require("express");
const {
  getOrCreateProfile,
  saveProfile,
  buildOperatingPlan
} = require("../services/exporterOperatingProfile");
const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

function workspaceRequired(req, res) {
  if (!req.tenant?.workspaceId) {
    res.status(400).json({ success: false, message: "Active workspace is required." });
    return false;
  }
  return true;
}

router.get("/profile", async (req, res) => {
  try {
    if (!workspaceRequired(req, res)) return;
    const profile = await getOrCreateProfile(req);
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load exporter operating profile", error: error.message });
  }
});

router.put("/profile", async (req, res) => {
  try {
    if (!workspaceRequired(req, res)) return;
    const profile = await saveProfile(req, req.body || {});

    await writeAuditLog(req, {
      module: "Exporter Operating System",
      action: "EXPORTER_PROFILE_UPDATED",
      entityType: "ExporterOperatingProfile",
      entityId: String(profile._id),
      severity: "Medium",
      metadata: { readinessScore: profile.readiness?.score || 0 }
    });

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save exporter operating profile", error: error.message });
  }
});

router.post("/prepare", async (req, res) => {
  try {
    if (!workspaceRequired(req, res)) return;
    const plan = await buildOperatingPlan(req);

    await writeAuditLog(req, {
      module: "Exporter Operating System",
      action: "EXPORTER_OPERATING_PLAN_PREPARED",
      entityType: "ExporterOperatingProfile",
      entityId: String(plan.profile._id),
      severity: "High",
      metadata: {
        readinessScore: plan.profile.readiness?.score || 0,
        systemsCovered: plan.profile.sourceSnapshot?.systemsCovered || []
      }
    });

    res.json({
      success: true,
      profile: plan.profile,
      gatewayPlan: plan.gatewayPlan,
      message: "TradeFlow operating plan prepared. Review blockers and complete official actions from the linked government systems."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to prepare exporter operating plan", error: error.message });
  }
});

module.exports = router;
