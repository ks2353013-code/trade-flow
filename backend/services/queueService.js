const { aiQueue } = require("../queues/aiQueue");

async function addAIWorkflowJob(data = {}) {
  return await aiQueue.add(
    "run-ai-workflow",
    data,
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );
}

module.exports = {
  addAIWorkflowJob
};