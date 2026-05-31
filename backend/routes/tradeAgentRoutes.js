const express = require("express");
const TradeMission = require("../models/TradeMission");
const { runTradeMission } = require("../services/tradeflowAgentOrchestrator");

const router = express.Router();

const AGENT_REPORT_KEYS = [
  "research",
  "buyerDiscovery",
  "supplierDiscovery",
  "crm",
  "compliance",
  "revenue",
  "outreach"
];

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

function hasReportValue(agentReports, key) {
  return Boolean(
    agentReports &&
    Object.prototype.hasOwnProperty.call(agentReports, key) &&
    agentReports[key]
  );
}

function missingAgentReportKeys(mission) {
  return AGENT_REPORT_KEYS.filter(
    (key) => !hasReportValue(mission.agentReports, key)
  );
}

async function buildAgentReportPatch(mission) {
  const missingKeys = missingAgentReportKeys(mission);

  if (!missingKeys.length || !mission.missionText) {
    return null;
  }

  const result = await runTradeMission(mission.missionText, {
    ownerEmail: mission.ownerEmail,
    companyId: mission.companyId || null,
    workspaceId: mission.workspaceId || null
  });

  const set = {};

  missingKeys.forEach((key) => {
    if (result.agentReports?.[key]) {
      set[`agentReports.${key}`] = result.agentReports[key];
    }
  });

  if (!Object.keys(set).length) {
    return null;
  }

  return {
    set,
    filledKeys: Object.keys(set).map((key) =>
      key.replace("agentReports.", "")
    )
  };
}

async function backfillMissionAgentReports(mission, filter) {
  const patch = await buildAgentReportPatch(mission);

  if (!patch) {
    return {
      mission,
      updated: false,
      filledKeys: []
    };
  }

  const updatedMission = await TradeMission.findOneAndUpdate(
    {
      _id: mission._id,
      ...filter
    },
    {
      $set: patch.set
    },
    {
      new: true
    }
  );

  return {
    mission: updatedMission || mission,
    updated: Boolean(updatedMission),
    filledKeys: patch.filledKeys
  };
}

async function backfillMissionsForTenant(filter) {
  const missions = await TradeMission.find(filter).sort({
    createdAt: -1
  });

  const results = [];
  const hydratedMissions = [];

  for (const mission of missions) {
    const result = await backfillMissionAgentReports(mission, filter);
    results.push(result);
    hydratedMissions.push(result.mission);
  }

  return {
    missions: hydratedMissions,
    updatedCount: results.filter((result) => result.updated).length,
    results
  };
}

router.get("/missions", async (req, res) => {
  try {
    const { missions } = await backfillMissionsForTenant(tenantFilter(req));

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

    const result = await runTradeMission(missionText);

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

router.post("/missions/backfill-agent-reports", async (req, res) => {
  try {
    const backfill = await backfillMissionsForTenant(tenantFilter(req));

    res.json({
      success: true,
      updatedCount: backfill.updatedCount,
      totalMissions: backfill.missions.length,
      results: backfill.results.map((result) => ({
        missionId: result.mission?._id,
        updated: result.updated,
        filledKeys: result.filledKeys
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Trade mission agent report backfill failed",
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
