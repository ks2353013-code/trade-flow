const express = require("express");

const AutomationWorkflow = require("../models/AutomationWorkflow");

const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

function tenant(req) {
  return {
    ownerEmail:
      req.tenant?.ownerEmail ||
      req.user?.email ||
      req.headers["x-user-email"] ||
      "unknown@tradeflow.local",

    companyId:
      req.tenant?.companyId ||
      req.headers["x-company-id"] ||
      undefined,

    workspaceId:
      req.tenant?.workspaceId ||
      req.headers["x-workspace-id"] ||
      undefined
  };
}

/* =========================
   CREATE WORKFLOW
========================= */

router.post(
  "/",

  enforceLimit("ai_request"),

  usageTracker("ai_request"),

  async (req, res) => {

    try {

      const data = req.body;

      const workflow =
        await AutomationWorkflow.create({

          ...tenant(req),

          name:
            data.name,

          description:
            data.description,

          triggerType:
            data.triggerType,

          triggerCondition:
            data.triggerCondition || {},

          actionType:
            data.actionType,

          actionConfig:
            data.actionConfig || {},

          enabled:
            data.enabled !== false

        });

      res.status(201).json(workflow);

    } catch (error) {

      console.error(
        "Workflow create error:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to create workflow"
      });

    }

  }
);

/* =========================
   GET WORKFLOWS
========================= */

router.get("/", async (req, res) => {

  try {

    const workflows =
      await AutomationWorkflow.find(
        tenant(req)
      ).sort({
        createdAt: -1
      });

    res.json(workflows);

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to fetch workflows"
    });

  }

});

/* =========================
   EXECUTE WORKFLOW
========================= */

router.post(
  "/:id/execute",

  async (req, res) => {

    try {

      const workflow =
        await AutomationWorkflow.findById(
          req.params.id
        );

      if (!workflow) {

        return res.status(404).json({
          message:
            "Workflow not found"
        });

      }

      workflow.executionCount += 1;

      workflow.lastExecutedAt =
        new Date();

      await workflow.save();

      const executionLog = {

        workflowId:
          workflow._id,

        executedAt:
          new Date(),

        trigger:
          workflow.triggerType,

        action:
          workflow.actionType,

        result:
          "Automation executed successfully"

      };

      res.json({

        success: true,

        executionLog,

        aiSummary:
          `TradeFlow AI executed workflow "${workflow.name}" successfully.`

      });

    } catch (error) {

      console.error(
        "Workflow execution error:",
        error.message
      );

      res.status(500).json({
        message:
          "Workflow execution failed"
      });

    }

  }
);

module.exports = router;