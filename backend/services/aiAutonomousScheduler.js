const cron = require("node-cron");
const axios = require("axios");

let schedulerStarted = false;

function getBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  );
}

function getSystemEmail() {
  return (
    process.env.AI_SYSTEM_EMAIL ||
    "ks2353013@gmail.com"
  );
}

function startAIAutonomousScheduler() {
  if (schedulerStarted) return;

  schedulerStarted = true;

  if (process.env.ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER !== "true") {
    console.log("AI Autonomous Scheduler HTTP runner disabled. Set ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER=true only after secure internal auth is configured.");
    return;
  }

  if (!process.env.AI_WORKER_BEARER_TOKEN) {
    console.log("AI Autonomous Scheduler disabled because AI_WORKER_BEARER_TOKEN is not configured.");
    return;
  }

  console.log("AI Autonomous Scheduler ready");

  cron.schedule("*/30 * * * *", async () => {
    try {
      const baseUrl = getBaseUrl();
      console.log("🤖 Running scheduled AI autonomous workflow...");

      const response = await axios.post(
        `${baseUrl}/api/ai-autonomous-workflows/run`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AI_WORKER_BEARER_TOKEN}`
          },
          timeout: 20000
        }
      );

      console.log(
        "✅ Scheduled AI workflow completed:",
        response.data?.summary || response.data?.message
      );
    } catch (error) {
      console.warn(
        "⚠️ Scheduled AI workflow failed:",
        error.response?.data?.message || error.message
      );
    }
  });
}

module.exports = {
  startAIAutonomousScheduler
};
