const express = require("express");

const router = express.Router();

router.post("/trade-agent", async (req, res) => {
  try {
    const {
      message
    } = req.body;

    res.json({
      success: true,
      reply:
        "TradeFlow AI processed: " + message
    });
  } catch (error) {
    res.status(500).json({
      message: "AI request failed"
    });
  }
});

module.exports = router;