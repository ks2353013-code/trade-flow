require("dotenv").config();

const { Worker } = require("bullmq");
const axios = require("axios");

function getBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  );
}

const worker = new Worker(
  "tradeflow-ai-queue",
  async (job) => {
    const email =
      job.data.email ||
      process.env.AI_SYSTEM_EMAIL ||
      "ks2353013@gmail.com";

    const baseUrl = getBaseUrl();

    const response = await axios.post(
      `${baseUrl}/api/ai-autonomous-workflows/run`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email
        },
        timeout: 30000
      }
    );

    return response.data;
  },
  {
    connection: {
      url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
    }
  }
);

worker.on("completed", (job, result) => {
  console.log("✅ AI queue job completed:", job.id, result?.summary || result?.message);
});

worker.on("failed", (job, error) => {
  console.warn("❌ AI queue job failed:", job?.id, error.message);
});

console.log("✅ TradeFlow AI Worker running");