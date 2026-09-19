const express = require("express");
const { createMission, listMissions, getMission, advanceMission, completeMissionAction } = require("../services/tradeMissionOrchestrator");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json({ success: true, missions: await listMissions(req) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/", enforceLimit("mission_create"), usageTracker("mission_create"), async (req, res) => {
  try {
    const result = await createMission(req, req.body || {});
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:missionId/actions/:actionKey/start", async (req, res) => {
  try { res.json({ success: true, mission: await advanceMission(req, req.params.missionId, req.params.actionKey) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
});

router.post("/:missionId/actions/:actionKey/complete", async (req, res) => {
  try { res.json({ success: true, mission: await completeMissionAction(req, req.params.missionId, req.params.actionKey) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
});

router.get("/:missionId", async (req, res) => {
  try {
    res.json({ success: true, mission: await getMission(req, req.params.missionId) });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

module.exports = router;
