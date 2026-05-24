const express = require("express");

const AutomationWorkflow = require("../models/AutomationWorkflow2");

const router = express.Router();

router.get("/overview", async (req, res) => {
  try {

    const totalWorkflows =
      await AutomationWorkflow.countDocuments();

    const activeWorkflows =
      await AutomationWorkflow.countDocuments({
        enabled: true
      });

    const workflowExecutions =
      await AutomationWorkflow.aggregate([
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
      await AutomationWorkflow.find()
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