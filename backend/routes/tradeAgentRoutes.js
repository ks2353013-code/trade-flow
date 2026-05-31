const express = require("express");
const TradeMission = require("../models/TradeMission");
const { runTradeMission } = require("../services/tradeflowAgentOrchestrator");

const router = express.Router();

function getOwnerEmail(req) {
  if (!req.user?.email) {
    throw new Error("Authenticated user email missing");
  }

  return String(req.user.email).toLowerCase().trim();
}

function tenantFilter(req) {
  const filter = {
    ownerEmail: getOwnerEmail(req)
  };

  if (req.tenant?.companyId) filter.companyId = req.tenant.companyId;
  if (req.tenant?.workspaceId) filter.workspaceId = req.tenant.workspaceId;

  return filter;
}

router.get("/missions", async (req, res) => {
  try {
    const missions = await TradeMission.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json({
      success: true,
      missions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch trade missions",
      error: error.message
    });
  }
});

router.post("/run", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);
    const { missionText } = req.body;

    if (!missionText) {
      return res.status(400).json({
        success: false,
        message: "missionText is required"
      });
    }

    const result = runTradeMission(missionText);

    const mission = await TradeMission.create({
      ownerEmail,
      companyId: req.tenant?.companyId || null,
      workspaceId: req.tenant?.workspaceId || null,
      missionText,
      ...result
    });

    res.status(201).json({
      success: true,
      mission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Trade agent mission failed",
      error: error.message
    });
  }
});

router.post("/missions/:id/approve", async (req, res) => {
  try {
    const mission = await TradeMission.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      {
        status: "Running",
        $push: {
          timeline: {
            title: "Mission approved by user",
            status: "Completed",
            at: new Date().toISOString()
          }
        }
      },
      { new: true }
    );

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: "Mission not found"
      });
    }

    res.json({
      success: true,
      mission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Mission approval failed",
      error: error.message
    });
  }
});

module.exports = router;