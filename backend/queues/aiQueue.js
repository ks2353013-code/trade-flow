const { Queue } = require("bullmq");

if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
  throw new Error("REDIS_URL is required for AI queues in production");
}

const connection = {
  connection: {
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
  }
};

const aiQueue = new Queue("tradeflow-ai-queue", connection);

module.exports = {
  aiQueue
};
