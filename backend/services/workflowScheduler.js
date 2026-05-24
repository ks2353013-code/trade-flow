const cron = require("node-cron");

const AutomationWorkflow = require("../models/AutomationWorkflow2");
const Notification = require("../models/Notification");

let schedulerStarted = false;

async function executeScheduledWorkflow(workflow) {
  try {
    workflow.executionCount = (workflow.executionCount || 0) + 1;
    workflow.lastExecutedAt = new Date();

    await workflow.save();

    await Notification.create({
      ownerEmail: workflow.ownerEmail,
      companyId: workflow.companyId,
      workspaceId: workflow.workspaceId,
      title: "Workflow Executed",
      message: `Automation workflow "${workflow.name}" executed successfully.`,
      type: "Workspace",
      priority: "Medium",
      metadata: {
        workflowId: workflow._id,
        triggerType: workflow.triggerType,
        actionType: workflow.actionType
      }
    });

    console.log(`✅ Scheduled workflow executed: ${workflow.name}`);
  } catch (error) {
    console.error("Scheduled workflow error:", error.message);
  }
}

function startWorkflowScheduler() {
  if (schedulerStarted) return;

  schedulerStarted = true;

  cron.schedule("*/5 * * * *", async () => {
    try {
      const workflows = await AutomationWorkflow.find({
        enabled: true,
        triggerType: {
          $in: [
            "scheduled",
            "inactive_deal",
            "daily_summary",
            "weekly_summary"
          ]
        }
      }).limit(50);

      for (const workflow of workflows) {
        await executeScheduledWorkflow(workflow);
      }
    } catch (error) {
      console.error("Workflow scheduler loop error:", error.message);
    }
  });

  console.log("✅ Workflow scheduler engine active");
}

module.exports = {
  startWorkflowScheduler
};