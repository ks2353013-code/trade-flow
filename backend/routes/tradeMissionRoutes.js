const express = require("express");
const { createMission, listMissions, getMission } = require("../services/tradeMissionOrchestrator");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json({ success: true, missions: await listMissions(req) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const result = await createMission(req, req.body || {});
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/:missionId", async (req, res) => {
  try {
    res.json({ success: true, mission: await getMission(req, req.params.missionId) });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

module.exports = router;
