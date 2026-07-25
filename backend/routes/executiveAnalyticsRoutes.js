const express = require("express");
const mongoose = require("mongoose");

const AutomationWorkflow = require("../models/AutomationWorkflow2");
const { requireFeature } = require("../middleware/planLimitMiddleware");

const router = express.Router();

function tenantFilter(req) {
  return {
    ownerEmail: req.tenant.ownerEmail,
    ...(req.tenant.companyId && mongoose.isValidObjectId(req.tenant.companyId)
      ? { companyId: new mongoose.Types.ObjectId(req.tenant.companyId) }
      : {}),
    ...(req.tenant.workspaceId && mongoose.isValidObjectId(req.tenant.workspaceId)
      ? { workspaceId: new mongoose.Types.ObjectId(req.tenant.workspaceId) }
      : {})
  };
}

router.get("/overview", requireFeature("executive_access"), async (req, res) => {
  try {
    const filter = tenantFilter(req);

    const totalWorkflows =
      await AutomationWorkflow.countDocuments(filter);

    const activeWorkflows =
      await AutomationWorkflow.countDocuments({
        ...filter,
        enabled: true
      });

    const workflowExecutions =
      await AutomationWorkflow.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$executionCount"
            }
          }
        }
      ]);

    const topWorkflows =
      await AutomationWorkflow.find(filter)
        .sort({
          executionCount: -1
        })
        .limit(5);

    const analytics = {

      revenueForecast: {
        projectedMonthly:
          250000,

        projectedQuarterly:
          720000,

        projectedYearly:
          3200000
      },

      crmPerformance: {
        conversionRate:
          68,

        activeDeals:
          124,

        highProbabilityDeals:
          39
      },

      aiOperations: {
        aiRequests:
          18240,

        automationExecutions:
          workflowExecutions?.[0]?.total || 0,

        activeAutomations:
          activeWorkflows
      },

      operationalHealth: {
        workflowEfficiency:
          91,

        automationSuccessRate:
          96,

        operationalRisk:
          "Low"
      },

      workflowInsights:
        topWorkflows.map((w) => ({
          name:
            w.name,

          executions:
            w.executionCount,

          trigger:
            w.triggerType,

          action:
            w.actionType
        }))
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {

    console.error(
      "Executive analytics error:",
      error.message
    );

    res.status(500).json({
      message:
        "Failed to load executive analytics"
    });

  }
});

module.exports = router;
