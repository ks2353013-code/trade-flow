require("dotenv").config();

const { Worker } = require("bullmq");
const axios = require("axios");

if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
  throw new Error("REDIS_URL is required for the AI worker in production");
}

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
    if (!process.env.AI_WORKER_BEARER_TOKEN) {
      throw new Error("AI_WORKER_BEARER_TOKEN is required before AI worker can call protected APIs");
    }

    const baseUrl = getBaseUrl();

    const response = await axios.post(
      `${baseUrl}/api/ai-autonomous-workflows/run`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_WORKER_BEARER_TOKEN}`
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
