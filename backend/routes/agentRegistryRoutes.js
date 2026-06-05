const express = require("express");
const { getAgentRegistry } = require("../services/agentRegistry");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    agents: getAgentRegistry()
  });
});

module.exports = router;
